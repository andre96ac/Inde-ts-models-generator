#!/usr/bin/env node

import yargs from 'yargs'
import {hideBin} from 'yargs/helpers'
import axios from "axios"
import { ERROR_CODES, INDE_TS_TYPES_MAP, INDE_TYPES, mapError, MyError, TS_TYPES } from '../utils/various.js'
import * as fs from 'fs/promises'
import {parseStringPromise} from "xml2js"
import { ClassGenerator } from '../utils/class-generator.js'







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
function createCommandHandler(args: yargs.ArgumentsCamelCase<{}>){

    console.log(args)

    const sourceUrl: string | null = args['url'] as string;
    const sourceFile:string | null =  args['file'] as string;
    


    loadMetadata(sourceUrl, sourceFile)
        .then(xmlData => getComponentsArrayFromXml(xmlData))
        .then(componentsArray => selectComponentsFromList(componentsArray, ['compgouego']))
        .then(componentsArray => {


            let arTsClasses: ClassGenerator[] = createArTsClassesFromArEntityType(componentsArray[0].EntityType)
            arTsClasses.forEach(el => {el.saveOnFileSystem('tests')})

        //    fs.writeFile('tests/new.json', JSON.stringify(componentsArray))
            console.log('All done')
        })
        .catch((err: MyError) => {
            if(err instanceof Error){
                console.error('some errors occurred creating files, please read below');
                console.error('Error: ', err);

            }
            else{
                console.error('some errors occurred creating files, please read below');
                console.error(`ErrorCode: ${err.code}`)
                console.error(`ErrorMessage: ${err.error}`)
            }
        } )
   

}


/**
 * Carica i metadati dall'url passato
 * @param url Url da cui caricare
 * @returns 
 */
function loadMetadataFromUrl(url: string): Promise<string>{
    return axios.get(url)
    .then(data => Promise.resolve(data.data))
    .catch(err => Promise.reject(mapError(err, ERROR_CODES.ERR_FETCHING_METADATA_URL)))
}


/**
 * Carica i metadati dal file passato
 * @param filePath percorso file
 * @returns 
 */
function loadMetadataFromFile(filePath: string): Promise<string>{
    return fs.readFile(filePath, {encoding: 'utf-8'})
    .then(data => Promise.resolve(data))
    .catch(err => Promise.reject(mapError(err, ERROR_CODES.ERR_READING_METADATA_FILE)))
}


/**
 * Carica i metadi dalla fondte passata
 * @param sourceUrl url da cui caricare l'xml
 * @param souceFile file da cui caricare l'xml
 * @returns 
 */
function loadMetadata(sourceUrl?: string, sourceFile?: string): Promise<string>{
    if(!!sourceUrl && sourceUrl.length > 0){
        return loadMetadataFromUrl(sourceUrl)
    }
    else if(!!sourceFile && sourceFile.length > 0){
        return loadMetadataFromFile(sourceFile)
    }
    else{
        return Promise.reject(mapError(new Error('No such parameters, please supply an url or a file path for metadata infos'), ERROR_CODES.ERR_PARAMETERS))
    }
}

/**
 * Converte l'xml in json  e lo pulisce, restituendo un array con i componenti inde
 * @param xmlData Stringa contenente i metadati in xml
 * @returns 
 */
function getComponentsArrayFromXml(xmlData: string): Promise<Record<string, any>[]>{
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
    .catch(err => Promise.reject(mapError(err, ERROR_CODES.ERR_PROCESSING_XML)))
}

/**
 * Pulisce l'array di componenti da quelli non voluti, mantenendo solo quelli i cui nomi sono presenti in whitelist
 * ATTENZIONE: tutti i nomi saranno convertiti e confrontati in minuscolo
 * @param arComponents array dei componenti in arrivo da inde (già puliti)
 * @param whiteList array di nomi dei componenti da conservare
 */
function selectComponentsFromList(arComponents: Record<string, any>[], whiteList?: string[]): Record<string, any>[]{
    if(!whiteList || whiteList.length == 0){
        console.warn('Component whitelist not found, selecting all components')
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

function createArTsClassesFromArEntityType(arEntityType: Record<string,any>[]):ClassGenerator[]{
    // #TODO

    return arEntityType.map(elEntity => createTsFromSingleObj(elEntity));
    
}





function createTsFromSingleObj(objEntity: Record<string, any>): ClassGenerator{
    
    let finalObj: null | ClassGenerator = null;
    
    const name = objEntity.$.Name;


    finalObj = new ClassGenerator(name);
    const arProperties:Record<string, any>[] = objEntity.Property;

    if(!!arProperties && arProperties.length > 0){

        arProperties.forEach(prop => {
    
        const propName = prop.$.Name;
        const finalType = converToTsType(prop.$.Type);
        const required = prop.$.Nullable == "false";
    
    
            if(!! finalObj){
                finalObj = finalObj.addProperty(propName, finalType, required, false)
            }
        })
    }

    

    return finalObj
}




/**
 * converte il tipo proveniente da inde in tipo typescript (se il tipo non è standard, si suppone sia un enum)
 * @param indeType tipo proveniente da inde
 * @returns 
 */
export function converToTsType(indeType: INDE_TYPES | string): TS_TYPES | string{

    let finalType: TS_TYPES | string | null = null;
   let arTsTypes  = Object.keys(INDE_TS_TYPES_MAP) as TS_TYPES[];
   arTsTypes.forEach((key: TS_TYPES, idx, other) => {
    
    if(INDE_TS_TYPES_MAP[key].includes(indeType as INDE_TYPES))
        finalType = key;
   })

   if(finalType == null){
        // si suppone che il tipo sia un enum, tolgo i punti e prendo solo l'ultima parte
        const tokens = indeType.split('.');
        finalType = tokens[tokens.length];
   }

   return finalType;
}

