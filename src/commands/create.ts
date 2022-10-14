#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import axios from "axios"
import { ERROR_CODES, INDE_TYPES, CustomError, TS_TYPES } from '../utils/various.js'
import * as fsPromises from 'fs/promises'
import * as fs from 'fs'
import {parseStringPromise} from "xml2js"
import { ClassGenerator } from '../utils/class-generator.js'
import { EnumListGenerator, EnumSingleGenerator } from '../utils/enum-generator.js'

import { CustomConfig } from '../utils/custom-config-interface.js'

import _DEFAULT_CONFIG from '../config-template.json' assert {type: 'json'};
const DEFAULT_CONFIG: CustomConfig = _DEFAULT_CONFIG as CustomConfig;




//#region MAIN

/**
 * Comando principale di creazione
 */
export function createCommand(): void{

    yargs(hideBin(process.argv))
        .command(
            'generate', 
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
                        throw new Error('Please specify at least one metadata url or filePath')
                    }

                })
            },
            createCommandHandler,
            
            
        )
        .demandCommand(1)
        .parse()


}

/**
 * Handler comando di creazione principale
 * @param args 
 */
async function createCommandHandler(args: yargs.ArgumentsCamelCase<{}>){

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

            
            // test
            // fs.writeFile('tests/new.json', JSON.stringify(componentsArray))

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
 * Carica i metadi dalla fondte passata
 * @param sourceUrl url da cui caricare l'xml
 * @param souceFile file da cui caricare l'xml
 * @returns 
 */
export function loadMetadata(sourceUrl?: string, sourceFile?: string): Promise<string>{
    if(!!sourceUrl && sourceUrl.length > 0){
        return loadMetadataFromUrl(sourceUrl)
    }
    else if(!!sourceFile && sourceFile.length > 0){
        return loadMetadataFromFile(sourceFile)
    }
    else{
        return Promise.reject(new CustomError('No such parameters, please supply an url or a file path for metadata infos', ERROR_CODES.ERR_PARAMETERS))
    }
}

/**
 * Converte l'xml in json  e lo pulisce, restituendo un array con i componenti inde
 * @param xmlData Stringa contenente i metadati in xml
 * @returns 
 */
export function getComponentsArrayFromXml(xmlData: string): Promise<Record<string, any>[]>{
    return parseStringPromise(xmlData)
    .then(data => {
        //get Edmx OBJ
        if(!!data){
            return Promise.resolve(data['edmx:Edmx'])
        }
        else{
            return Promise.reject('data incoming from xml to json is undefined ')
        }
    })
    .then(data => {
        // get dataservice obj
        if(!!data){
            return Promise.resolve(data['edmx:DataServices'])
        }
        else{
            return Promise.reject('data is undefined after first level cleaning')
        }
    })
    .then((data: any[]) => {
        // get schema obj
        if(!!data && data.length > 0){
            return Promise.resolve(data[0]['Schema'])
        }
        else{
            return Promise.reject('data is undefined after second level cleaning')
        }
    })
    .then((data: any[]) => {
        if(!! data && data.length > 0){
            return Promise.resolve(data)
        }
        else{
            return Promise.reject('no components found in metadata')
        }
    })
    .catch(err => Promise.reject(new CustomError(err, ERROR_CODES.ERR_PROCESSING_XML)))
}

/**
 * Pulisce l'array di componenti da quelli non voluti, mantenendo solo quelli i cui nomi sono presenti in whitelist
 * ATTENZIONE: tutti i nomi saranno convertiti e confrontati in minuscolo
 * @param arComponents array dei componenti in arrivo da inde (già puliti)
 * @param whiteList array di nomi dei componenti da conservare
 */
export function filterComponentsFromList(arComponents: Record<string, any>[], whiteList: string[] | null): Record<string, any>[]{
    if(!whiteList){
        console.warn('Component whitelist not found, selecting only app')
        return [arComponents[0]];
    }
    else if(whiteList.length == 1 && whiteList[0] == '*'){
        return arComponents;
    }
    else{
        whiteList = whiteList.map(el => el.toLowerCase())
        return arComponents.filter((el:Record<string, any>) => {
            const name = el.EntityContainer[0]?.$?.Name?.toLowerCase();
            return whiteList?.includes(name)
        })
    }
}


/**
 * Preso in input l'array entityType, crea e restituisce l'array di classGenerators corrispondente
 * @param arEntityType 
 * @returns 
 */
export function createArTsClassesFromArEntityType(arEntityType: Record<string,any>[], config: CustomConfig):ClassGenerator[]{
    return arEntityType.map(elEntity => createTsClassFromSingleObj(elEntity, config));
    
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

/**
 * Carica i metadati dall'url passato
 * @param url Url da cui caricare
 * @returns 
 */
 function loadMetadataFromUrl(url: string): Promise<string>{
    return axios.get(url)
    .then(data => Promise.resolve(data.data))
    .catch(err => Promise.reject(new CustomError(err, ERROR_CODES.ERR_FETCHING_METADATA_URL)))
}

/**
 * Carica i metadati dal file passato
 * @param filePath percorso file
 * @returns 
 */
function loadMetadataFromFile(filePath: string): Promise<string>{
    return fsPromises.readFile(filePath, {encoding: 'utf-8'})
    .then(data => Promise.resolve(data))
    .catch(err => Promise.reject(new CustomError(err, ERROR_CODES.ERR_READING_METADATA_FILE)))
}


function createSingleTsEnumFromObjEnum(objEnum: Record<string, any>, config: CustomConfig): EnumSingleGenerator | undefined{
    if(!!objEnum && !!objEnum.$ && !!objEnum.Member){
        const name = objEnum.$.Name;
        const arValues: Record<string, any>[] = objEnum.Member;
        const incomingType: INDE_TYPES | null = objEnum.$.UnderlyingType;


        const finalTsType: TS_TYPES | null = !!incomingType? ClassGenerator.converToTsType(incomingType).finalType as TS_TYPES : null;


        const returnFactory = new EnumSingleGenerator(name, finalTsType, config);
        arValues.forEach(elValue => {returnFactory.addProperty(elValue.$?.Name, elValue.$?.Value)})
        return returnFactory
    }
    else{
        console.warn(`WARNING: Enum ${objEnum?.$?.Name} skipped, name or members not found`)
    }
}

function createTsClassFromSingleObj(objEntity: Record<string, any>, config: CustomConfig): ClassGenerator{
    
    let finalObj: null | ClassGenerator = null;
    
    const name = objEntity.$.Name;


    finalObj = new ClassGenerator(name, config);
    const arProperties:Record<string, any>[] = objEntity.Property;

    if(!!arProperties && arProperties.length > 0){

        arProperties.forEach(prop => {
    
        const propName = config.propertiesCustomPrefix + prop.$.Name;
        const {finalType, isEnum} = ClassGenerator.converToTsType(prop.$.Type);
        const required = prop.$.Nullable == "false";
    
    
            if(!! finalObj){
                finalObj = finalObj.addProperty(propName, finalType, required, config.propertiesAccessibility)
                if(isEnum){
                    finalObj.addImport(finalType, `./Domains${config.importsPathExtension? '.js' : ''}`);
                }
            }
        })
    }

    

    return finalObj
}

function handleError(err: CustomError | Error){
    if(err instanceof CustomError){
        console.error('some errors occurred creating files, please read below');
        console.error(`ErrorCode: ${err.errorCode}`)
        console.error(`ErrorMessage: ${err.message}`)
        console.error(`ErrorMessage: ${err.stack}`)
    }
    else{
        console.error('some errors occurred creating files, please read below');
        console.error('Error: ', err.stack);

    }



}

/**
 * Carica la configurazione fondendo l'oggetto default, con quello caricato dall'eventuale percorso passato
 * @param suppliedPath 
 * @returns 
 */
function loadConfig(suppliedPath: string | undefined): Promise<CustomConfig>{



    const loadTask = !!suppliedPath && suppliedPath.length > 0 ? fsPromises.readFile(suppliedPath, {encoding: 'utf-8'}) : Promise.reject();

    return loadTask 
            .then(loadedString => Promise.resolve(JSON.parse(loadedString)))
            .then((loadedObj: CustomConfig) => {
                return Promise.resolve(mergeConfig(DEFAULT_CONFIG, loadedObj))
            })
            .catch(err => Promise.resolve(mergeConfig(DEFAULT_CONFIG)))
            
}


/**
 * Fonde le proprietà tra i due oggetti di configurazione, prendendo quelle del supplied e sostituendone i valori a quelli nel default
 * @param defaultConfig 
 * @param suppliedConfig 
 * @returns 
 */
function mergeConfig(defaultConfig: CustomConfig, suppliedConfig?: CustomConfig):CustomConfig{
    if(!suppliedConfig){
        console.log('No config supplied... using default options')
        return defaultConfig;
    }
    else{
        console.log('Custom config detected!')
        const finalConfig = defaultConfig;
        // return Object.assign(defaultConfig, suppliedConfig)
        const arKeys: (keyof typeof finalConfig)[] = Object.keys(finalConfig) as (keyof CustomConfig)[]
        arKeys.forEach(key => {
            if(suppliedConfig[key] !== undefined){
         
                //@ts-ignore
                finalConfig[key] = suppliedConfig[key]
            }
        })
        return finalConfig;
    }

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

                // TODO verbse mode
                // console.warn('Error Code: ', err.errorCode);
                // console.warn('Error message: ', err.message);

                return Promise.resolve();
            })}))
            .then(() => Promise.resolve())

            // salvataggio enums
            const promiseEnum: Promise<void> = enumFactory.saveToFile(finalPath).catch((err: CustomError) => {
                console.warn(`WARNING: Unable to save enums file, in component ${compName}; enums skipped`);
               
                // TODO verbse mode
                // console.warn('Error Code: ', err.errorCode);
                //  console.warn('Error message: ', err.message);
                return Promise.resolve();

            })

            return Promise.all([promiseModels, promiseEnum]).then(() => Promise.resolve())
            
            

}
//#endregion PRIVATES



