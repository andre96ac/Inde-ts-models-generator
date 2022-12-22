import axios from "axios"
import {parseStringPromise} from "xml2js"
import * as fsPromises from 'fs/promises'
import { CustomError, ERROR_CODES } from "../core/various.js"
import { CustomConfig } from "../core/interfaces/custom-config-interface.js"

import _DEFAULT_CONFIG from '../config-template.json' assert {type: 'json'};
const DEFAULT_CONFIG: CustomConfig = _DEFAULT_CONFIG as CustomConfig;





//#region EXPORTS

/**
 * Carica i metadi dalla fondte passata
 * @param sourceUrl url da cui caricare l'xml
 * @param souceFile file da cui caricare l'xml
 * @returns 
 */
 export function loadMetadata(sourceUrl: string | null, sourceFile: string | null, config: CustomConfig): Promise<string>{
    if(!!sourceUrl && sourceUrl.length > 0){
        return loadMetadataFromUrl(sourceUrl)
    }
    else if(!!sourceFile && sourceFile.length > 0){
        return loadMetadataFromFile(sourceFile)
    }
    else if(!!config.sourceUrl && config.sourceUrl.length > 0){
        return loadMetadataFromUrl(config.sourceUrl);
    }
    else if(!!config.sourceFilePath && config.sourceFilePath.length > 0){
        return loadMetadataFromFile(config.sourceFilePath);
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
 * Funzione di gestione dell'errore 
 * @param err 
 */
export function handleError(err: CustomError | Error){
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
 export function loadConfig(suppliedPath: string | undefined): Promise<CustomConfig>{



    const loadTask = !!suppliedPath && suppliedPath.length > 0 ? fsPromises.readFile(suppliedPath, {encoding: 'utf-8'}) : Promise.reject();

    return loadTask 
            .then(loadedString => Promise.resolve(JSON.parse(loadedString)))
            .then((loadedObj: CustomConfig) => {
                return Promise.resolve(mergeConfig(DEFAULT_CONFIG, loadedObj))
            })
            .catch(err => Promise.resolve(mergeConfig(DEFAULT_CONFIG)))
            
}


/**
 * 
 * @param arEntities 
 * @param whiteList 
 * @returns 
 */
 export function filterEntitiesFromList(arEntities: Record<string, any>[], whiteList: string[]): Record<string, any>[]{
    const wildCard: boolean = !!whiteList && whiteList.length == 1 && whiteList[0] == '*'
    return arEntities.filter(el => wildCard || whiteList.includes(el.$.Name))
}
//#endregion


//#region PRIVATES


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




//#endregion