#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import { INDE_TYPES, CustomError, TS_TYPES } from '../core/various.js'
import * as fs from 'fs'
import { ClassGenerator } from '../core/class-generator.js'
import { EnumListGenerator, EnumSingleGenerator } from '../core/enum-generator.js'

import { CustomConfig } from '../core/interfaces/custom-config-interface.js'

import { loadMetadata, loadConfig, getComponentsArrayFromXml, filterComponentsFromList, handleError, filterEntitiesFromList } from './common-funcions.js'





//#region MAIN


/**
 * Comando principale di creazione
 */
export function generateModelsCommand(): void{

    yargs(hideBin(process.argv))
        .command(
            'generate-models', 
            'fetch the contents of the URL and create .model.ts files', 
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
                        console.warn('Warning: no sourceUrl or sourceFile supplied from command line; looking for config file...')
                        return true;
                        // throw new Error('Please specify at least one metadata url or filePath')
                    }

                })
            },
            generateModelsCommandHandler,
            
            
        )
        .demandCommand(1)
        .parse()


}

/**
 * Handler comando di creazione principale
 * @param args 
 */
async function generateModelsCommandHandler(args: yargs.ArgumentsCamelCase<{}>){

    console.log(args)

    const sourceUrl: string | null =  args['url'] as string;
    const sourceFile:string | null =  args['file'] as string;
    const configSuppliedUrl: string | null = args['config'] as string;

    const config: CustomConfig = await loadConfig(configSuppliedUrl)
    console.log(config);

    loadMetadata(sourceUrl, sourceFile, config)
    


        //pulizia e conversione in json
        .then(xmlData => getComponentsArrayFromXml(xmlData))
        //selezione componenti che mi interessano
        .then(componentsArray => filterComponentsFromList(componentsArray, config.componentsWhiteList))
        .then(componentsArray => {

            if(config.verbose){
                // test
                // fs.writeFile('tests/new.json', JSON.stringify(componentsArray))
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
export function createArTsClassesFromArEntityType(arEntityType: Record<string,any>[], config: CustomConfig):ClassGenerator[]{
    const finalArEntityType: Record<string, any>[] = filterEntitiesFromList(arEntityType, config.entitiesWhiteList);

    return finalArEntityType.map(elEntity => createTsClassFromSingleObj(elEntity, config));
    
}


/**
 * Preso in imput l'array generico EnumType, crea e restituisce il corrispondente enumListGenerator
 * @param arEnumType 
 * @returns 
 */
export function createTsEnumGeneratorFromArEnumType(arEnumType: Record<string, any>[], config: CustomConfig):EnumListGenerator{



    const arEnums = arEnumType?.map(el => createSingleTsEnumFromObjEnum(el, config));

    return new EnumListGenerator().addEnum(arEnums)

}


//#endregion MODULE EXPORTS






//#region PRIVATES



function createSingleTsEnumFromObjEnum(objEnum: Record<string, any>, config: CustomConfig): EnumSingleGenerator | undefined{
    if(!!objEnum && !!objEnum.$ && !!objEnum.Member){
        const name = objEnum.$.Name;
        const arValues: Record<string, any>[] = objEnum.Member;
        const incomingType: INDE_TYPES | null = objEnum.$.UnderlyingType;


        const finalTsType: TS_TYPES | null = !!incomingType? ClassGenerator.convertToTsType(incomingType).finalType as TS_TYPES : null;


        const returnFactory = new EnumSingleGenerator(name, finalTsType, config);
        arValues.forEach(elValue => {returnFactory.addProperty(elValue.$?.Name, elValue.$?.Value)})
        return returnFactory
    }
    else{
        console.warn(`WARNING: Enum ${objEnum?.$?.Name} skipped, name or members not found`)
    }
}

function createTsClassFromSingleObj(objEntity: Record<string, any>, config: CustomConfig): ClassGenerator{
    

    let arPrimaryKeys = []
    if(!!objEntity.Key){
        arPrimaryKeys = objEntity.Key[0].PropertyRef.map((el:any) => el.$.Name);
    }


    let finalObj: null | ClassGenerator = null;
    
    const name = objEntity.$.Name;


    finalObj = new ClassGenerator(name, config);
    const arProperties:Record<string, any>[] = objEntity.Property;

    if(!!arProperties && arProperties.length > 0){

        arProperties.forEach(prop => {
    
        const propName = config.propertiesCustomPrefix + prop.$.Name;
        const {finalType, isEnum} = ClassGenerator.convertToTsType(prop.$.Type);
        const required = prop.$.Nullable == "false";
    
    
            if(!! finalObj){
                finalObj = finalObj.addProperty(propName, finalType, required, config.propertiesAccessibility)
                if(isEnum){
                    finalObj.addImport(finalType, `./Domains${config.importsPathExtension? '.js' : ''}`);
                }
            }
        })
    }

    finalObj.setKeys(arPrimaryKeys);

    

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
            const baseFolderName: string = 'models';
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
            const arTsClasses: ClassGenerator[] = createArTsClassesFromArEntityType(component.EntityType, config);
            // creazione enums
            const enumFactory: EnumListGenerator = createTsEnumGeneratorFromArEnumType(component.EnumType, config);


            // salvataggio modelli
            const promiseModels: Promise<void> = Promise.all(arTsClasses.map(el => {el.saveOnFileSystem(finalPath).catch((err: CustomError) => {
                console.warn(`WARNING: Unable to save ${el. fileName}, in component ${compName}; model skipped`)

                if(config.verbose){
                    console.warn('Error Code: ', err.errorCode);
                    console.warn('Error message: ', err.message);
                }

                return Promise.resolve();
            })}))
            .then(() => Promise.resolve())

            // salvataggio enums
            const promiseEnum: Promise<void> = enumFactory.saveToFile(finalPath).catch((err: CustomError) => {
                console.warn(`WARNING: Unable to save enums file, in component ${compName}; enums skipped`);
               
                if(config.verbose){
                    console.warn('Error Code: ', err.errorCode);
                     console.warn('Error message: ', err.message);
                }
                return Promise.resolve();

            })

            return Promise.all([promiseModels, promiseEnum]).then(() => Promise.resolve())
            
            

}
//#endregion PRIVATES



