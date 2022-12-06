#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import { CustomError } from '../core/various.js'
import * as fs from 'fs'

import { CustomConfig } from '../core/interfaces/custom-config-interface.js'

import _DEFAULT_CONFIG from '../config-template.json' assert {type: 'json'};
import { filterComponentsFromList, filterEntitiesFromList, getComponentsArrayFromXml, handleError, loadConfig, loadMetadata } from './common-funcions.js'
import { SqlGenerator } from '../core/sql-generator.js'




//#region MAIN


/**
 * Comando principale di creazione
 */
export function generateSqlCommand(): void{

    yargs(hideBin(process.argv))
        .command(
            'generate-sql', 
            'fetch the contents of the URL and create .sql table creation files', 
            (yargs) => {
                return yargs.option('url', {
                    alias: 'u',
                    type: 'string',
                    description: 'url from which to retrieve the $metadata xml file',
                })
                .option('file', {
                    alias: 'f',
                    type: 'string',
                    description: '$metadata xml file path',
                })
                .option('config', {
                    alias: 'c',
                    type:'string',
                    description: 'configuration file path'
                })
                .check((argv) => {
                    if((!!argv.file && argv.file.length > 0) || (!!argv.url && argv.url.length > 0)){
                        return true
                    }
                    else {
                        throw new Error('Please specify at least one metadata url or filePath')
                    }

                })
            },
            generateSqlCommandHandler,
            
            
        )
        .demandCommand(1)
        .parse()


}

/**
 * Handler comando di creazione principale
 * @param args 
 */
async function generateSqlCommandHandler(args: yargs.ArgumentsCamelCase<{}>){

    console.log(args)

    const sourceUrl: string | null = args['url'] as string;
    const sourceFile:string | null =  args['file'] as string;
    const configSuppliedUrl: string | null = args['config'] as string;

    const config: CustomConfig = await loadConfig(configSuppliedUrl)
    console.log(config);

    loadMetadata(sourceUrl, sourceFile)
    


        //pulizia e conversione in json
        .then(xmlData => getComponentsArrayFromXml(xmlData))
        //selezione componenti che mi interessano
        .then(componentsArray => filterComponentsFromList(componentsArray, config.componentsWhiteList))
        .then(componentsArray => {


            if(config.verbose){
                // test
                console.log('############## GENERATED COMPONENT ARRAY ##############');
                console.log(componentsArray, '\n');
            }
            if(config.saveJsonToFile){
                fs.promises.writeFile('./inde.json', JSON.stringify(componentsArray))
            }

    

            return Promise.all(componentsArray.map(el => processComponent(el, config)))


           
            
        })
        .then(() => {            
            console.log('All done')
        })
        .catch(handleError)
   

}

//#endregion MAIN






//#region MODULE EXPORTS







/**
 * Preso in input l'array entityType, crea e restituisce l'array di classGenerators corrispondente
 * @param arEntityType 
 * @returns 
 */
export function createArSqlClassesFromComp(component: Record<string, any>, config: CustomConfig):SqlGenerator[]{
    const compName = !!component?.EntityContainer[0]?.$?.Name? component?.EntityContainer[0]?.$?.Name : 'null';
    const arEntityType: Record<string, any>[] = component.EntityType;
    
    const finalArEntityType: Record<string, any>[] = filterEntitiesFromList(arEntityType, config.entitiesWhiteList);

    const arEnumType: Record<string, any>[] = component.EnumType;
    return finalArEntityType.map(elEntity => createSqlClassFromSingleObj(elEntity, arEnumType, config, compName));
    
}



//#endregion MODULE EXPORTS






//#region PRIVATES



function createSqlClassFromSingleObj(objEntity: Record<string, any>, arEnums: Record<string, any>[], config: CustomConfig, compName: string = ''): SqlGenerator{
    

    let arPrimaryKeys: string[] = []
    if(!!objEntity.Key){
        arPrimaryKeys = objEntity.Key[0].PropertyRef.map((el:any) => el.$.Name);
    }


    let finalObj: null | SqlGenerator = null;
    
    const name = objEntity.$.Name;


    finalObj = new SqlGenerator(name, config, config.compAsDbName? compName : '');
    const arProperties:Record<string, any>[] = objEntity.Property;

    if(!!arProperties && arProperties.length > 0){

        arProperties.forEach(prop => {
    
        const propName = config.propertiesCustomPrefix + prop.$.Name;
        const finalType = SqlGenerator.converToSqlType(prop.$.Type, arEnums);
        const required = prop.$.Nullable == "false";
        const isKey = arPrimaryKeys.includes(propName);
    
    
            if(!! finalObj){
                //TODO BISOGNA GESTIRE I TIPI ENUm
                if(isKey){
                    finalObj = finalObj.addPrimaryKey(propName, finalType)
                }
                else{
                    finalObj = finalObj.addProperty(propName, finalType, required)
                }
            }
        })
    }


    

    return finalObj
}







/**
 * Processa il componente e crea effettivamente gli modelli ed enum
 * @param component 
 * @param config 
 * @returns 
 */
function processComponent(component: Record<string, any>, config: CustomConfig): Promise<void>{


            const compName: string = !!component?.EntityContainer[0]?.$?.Name? component?.EntityContainer[0]?.$?.Name : 'null';
            const baseFolderName: string = 'sql';
            const basePath: string = !!config?.outDir? config.outDir : './'



            const finalPath: string = `${basePath}${basePath.endsWith('/')? '' : '/'}${baseFolderName}/${compName}/`

            // Il percorso non esiste, non posso salvare
            if(!fs.existsSync(basePath)){
                return Promise.reject(new CustomError(`Unable to save ${compName} files; base path supplied (${basePath}) not found`))
            }

            if(!fs.existsSync(basePath + (basePath.endsWith('/')? '' : '/') + baseFolderName)){
                // primo componente che faccio; creo la cartella generica
                fs.mkdirSync(basePath + (basePath.endsWith('/')? '' : '/') + baseFolderName)
            }

            //ora creo la cartella componente
            if(!fs.existsSync(finalPath)){
                fs.mkdirSync(finalPath);
            }

            //partiamo

            //creazione modelli
            const arTsClasses: SqlGenerator[] = createArSqlClassesFromComp(component, config);
            // creazione enums
            // const enumFactory: EnumListGenerator = createTsEnumGeneratorFromArEnumType(component.EnumType, config);


            // salvataggio modelli
            let promiseModels: Promise<void> 

            if(config.outputSingleFile){
                const finalString = arTsClasses
                                            .map(el => el.getFileContentString())
                                            .reduce((acc, el) => `${acc}\n\n\n${el}`)

                                            
                const finalPathName = `${finalPath}${compName}.sql`

                if(config.verbose){
                    console.log(finalString);
                    console.log(finalPathName);
                }

                promiseModels = fs.promises.writeFile(finalPathName, finalString)
                                                            .catch(err => {
                                                                console.warn(`WARNING: Unable to save component ${compName} sql file; component skipped`)
                                                                if(config.verbose){
                                                                    console.warn('Error: ', err.errorCode);
                                                                }
                                                                return Promise.resolve();
                                                            })

            }

            else{
                promiseModels = Promise.all(arTsClasses.map(el => {el.saveOnFileSystem(finalPath).catch((err: CustomError) => {
                    console.warn(`WARNING: Unable to save ${el. fileName}, in component ${compName}; model skipped`)
    
                    if(config.verbose){
                        console.warn('Error Code: ', err.errorCode);
                        console.warn('Error message: ', err.message);
                    }
    
                    return Promise.resolve();
                })}))
                .then(() => Promise.resolve())

            }
            

            // // salvataggio enums
            // const promiseEnum: Promise<void> = enumFactory.saveToFile(finalPath).catch((err: CustomError) => {
            //     console.warn(`WARNING: Unable to save enums file, in component ${compName}; enums skipped`);
               
            //     // TODO verbse mode
            //     // console.warn('Error Code: ', err.errorCode);
            //     //  console.warn('Error message: ', err.message);
            //     return Promise.resolve();

            // })

            return promiseModels.then(() => Promise.resolve())
            
            

}
//#endregion PRIVATES



