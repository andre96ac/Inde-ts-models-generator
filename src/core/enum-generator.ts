import * as fs from 'fs/promises'
import { CustomConfig } from './interfaces/custom-config-interface.js';
import { ERROR_CODES, CustomError, TS_TYPES } from './various.js';

export class EnumListGenerator{

    private arEnums: EnumSingleGenerator[] = [];
    private fileName: string = 'domains.ts'

    constructor(fileName?: string){
        if(!!fileName && fileName.length > 0){
            this.fileName = fileName;
        }
    }

    /**
     * Aggiunge uno o più enum (se viene passato un array, i nuovi enum verranno aggiunti in fondo)
     * @param enumToAdd 
     * @returns 
     */
    addEnum(enumToAdd: EnumSingleGenerator | (EnumSingleGenerator | undefined)[]): EnumListGenerator{
        if(!! enumToAdd){
            if(enumToAdd instanceof EnumSingleGenerator){
                this.arEnums.push(enumToAdd)
            }
            else if(enumToAdd instanceof Array && enumToAdd.length > 0){

                this.arEnums = this.arEnums.concat(enumToAdd.filter(el => el !== undefined) as EnumSingleGenerator[])
            }
        }
        else{
            console.warn('Attention, enum skipped, is undefined')
        }

        return this
    }


    /**
     * Ottiene la stringa finale con tutti i dati che verranno salvati sul file
     * @returns 
     */
    getFinalStringRepresentation(filePath?: string): Promise<string>{
        if(!!this.arEnums && this.arEnums.length > 0){
            return Promise.resolve(this.arEnums
                            .map(el => `${el.getFinalString()}\n\n\n`)
                            .reduce((el, acc) => el + acc));

        }
        else{
            return Promise.reject(new CustomError(`WARNING: unable to get enum string representation; arEnums is undefined, unable to save ${filePath}`, ERROR_CODES.ERR_SAVING_ENUM_FILE))
        }
    }


    /**
     * Crea il file contenente tutti gli enum
     * @param path percorso in cui crearre il file
     * @returns 
     */
    saveToFile(path: string): Promise<void>{
        if(!!path && path.length > 0){
            if(!path.endsWith('/')){
                path += '/'
            }
            path += this.fileName;
            return this.getFinalStringRepresentation(path).then(data => {
                return fs.writeFile(path, data)   
                .catch(err => Promise.reject(new CustomError(err, ERROR_CODES.ERR_SAVING_ENUM_FILE)));
            }) 
        }
        else{
            return Promise.reject(new CustomError('Error, unable to save enums, path not supplied', ERROR_CODES.ERR_SAVING_ENUM_FILE))
        }
    }




 

}


export class EnumSingleGenerator{

    private suppliedName: string = '';
    private arProperties: EnumPropertyDescriptor[] = [];
    private type: TS_TYPES | null;



    /**
    * Elimina tutta la parte prima del punto, e mette il nome tutto maiuscolo
    * @param incomingName nome enuma in arrivo da inde
    */
    public static normalizeEnumName(incomingName: string): string{

        const tokens = incomingName.split('.');
        return tokens[tokens.length - 1]?.toUpperCase();

    }

    /**
     * Mette il nome tutto maiuscolo e sostituisce eventuali spazi con _
     * @param incomingName 
     * @returns 
     */
    public static normalizePropertyName(incomingName: string): string{
        const _this = this;
        if(!! incomingName && incomingName.length > 0){

            //filtering unallowed characters
            const returnName = incomingName
                    .toUpperCase()
                    .split(' ')
                    .reduce(this.reattachStrings)
                    .split('-')
                    .reduce(this.reattachStrings)
                    .split('.')
                    .reduce(this.reattachStrings)
                    .split(',')
                    .reduce(this.reattachStrings)
                    .split('+')
                    .reduce(this.reattachStrings)
                    .split('/')
                    .reduce(this.reattachStrings)
                    .split('(')
                    .reduce(this.reattachStrings)
                    .split(')')
                    .reduce(this.reattachStrings)
                    .split('%')
                    .reduce(this.reattachStrings)
                    .split('\'')
                    .reduce(this.reattachStrings)

            //adding prefix to escape nubers at first position
            return this.isNumber(returnName.charAt(0)) ? `_${returnName}` : returnName
                    
        }
        else{
            return incomingName
        }
    }

    private static isNumber(stringToCheck:string): boolean{
        return !isNaN(parseInt(stringToCheck))
    }

    private static reattachStrings(el: string, acc: string): string{
        if(el.endsWith('_') && acc.startsWith('_')){
            return el.substring(0, el.length - 1) + acc
        }
        else if(el.endsWith('_') || acc.startsWith('_')){
            return el + acc
        }
        else{
            return `${el}_${acc}`
        }
    }

    /**
     * Restituisce il nome finale dell'enum normalizzato
     * @returns 
     */
    private getFinalEnumName():string{
        return EnumSingleGenerator.normalizeEnumName(this.suppliedName)
    }

    /**
     * Restituisce la rappresentazione in stringa per il valore passato (la formattazione tiene conto del tipo dell'enum: stringa o number)
     * @param prop 
     * @returns 
     */
    private getPropFormattedValue(prop: EnumPropertyDescriptor): string | number{
        switch (this.type){
            case 'number':
                return prop.value
            default:
                return `"${prop.value}"`
        }
        
    }


    /**
     * 
     * @param name nome dell'enum
     * @param type tipo di enum; se viene passato null, si assume tipo stringa
     */
    constructor(name: string, type: TS_TYPES | null, params: CustomConfig){
        if(!!name && name.length > 0){
            this.suppliedName = name;
        }

        this.type = type;
    }

    /**
     * Aggiunge una proprietà all'enum
     * @param name 
     * @param value 
     */
    public addProperty(name: string, value: string | number): EnumSingleGenerator{
        if(!!name && !!value){
            name = EnumSingleGenerator.normalizePropertyName(name);
            this.arProperties.push({name, value});
        }
        return this;
    }

    /**
     * Restituisce la stringa finale rappresentante l'enum
     * @returns 
     */
    public getFinalString(): string{
        const first = `export enum ${this.getFinalEnumName()}{\n\n`

        const last = `\n\n}`


        const properties = this.arProperties
                            .map(prop => `\t${prop.name} = ${this.getPropFormattedValue(prop)}, \n`)
                            .reduce((el, acc) => el+acc)
                            .slice(0, -2)


        return first + properties + last;
    }



}

export interface EnumPropertyDescriptor{
    name: string;
    value: string | number
}

