import * as fs from 'fs/promises'

import { CustomConfig } from './interfaces/custom-config-interface.js';
import { SqlGeneratorProperty } from './interfaces/generator-property-interface.js';
import { CustomError, ERROR_CODES, INDE_SQL_TYPES_MAP, INDE_TYPES, SQL_TYPES } from './various.js';


export class SqlGenerator{
    //proprietà della classe
    private arProperties: SqlGeneratorProperty[] = [];

    //nome fornito
    private suppliedName: string = '';

    //parametri di configurazione
    private params: CustomConfig;

    //nome del db
    private dbName: string = '';



    /**
     * Restituisce il nome fornito TUTTO MAIUSCOLO
     */
    public get dbTableName():string{
        if(!!this.dbName && this.dbName.length > 0){
            return `${this.dbName}.${this.suppliedName}`
        }
        else{
            return this.suppliedName;
        }
    }


    public get fileName(): string{
        return `${this.suppliedName.toUpperCase()}.sql`
    }


    public constructor(name: string, config: CustomConfig, dbName: string = ''){
        this.suppliedName = name;
        this.params = config;
        this.dbName = dbName; 
    }

    /**
     * Aggiunge un campo alla tabella  
     * @param name 
     * @param type 
     * @param required 
     * @returns 
     */
    public addProperty(name: string, type: SQL_TYPES, required: boolean = false, isPrimary: boolean = false): SqlGenerator{
        if(!!name && name.length > 0 && !!type && type.length > 0 && required !== null && required !== undefined){
            this.arProperties.push({
                name,
                type,
                required: required,
                isPrimary
            })

        }
        else{
            console.warn(`Error, property ${name} ignored, not all parameters supplied`);
        }

        return this
    }

    /**
     * Aggiunge un campo chiave primaria alla tabella
     * @param name 
     * @param type 
     * @param required 
     * @returns 
     */
    public addPrimaryKey(name: string, type: SQL_TYPES): SqlGenerator{
        
        this.addProperty(name, type, false, true);
        return this;
    }



    /**
     * Restituisce la stringa completa del file sql
     * @returns 
     */
    public getFileContentString(): string{

        const start = `CREATE TABLE ${this.params.ifNotExistCondition? `IF NOT EXISTS` : ''} ${this.dbTableName} (\n`;
        const end = `)${this.params.generateRowId? '' : ' WITHOUT ROWID'}; \n\n`
        const properties = this.getPropertiesString();


        return (
            start       +
            properties  +
            end
        )

        
    }


    private getPropertiesString(): string{
        return this.arProperties
                                .map(elProp => `\t${elProp.name} ${elProp.type}${elProp.isPrimary? ' PRIMARY KEY' : ''}${elProp.required? ' NOT NULL' : ''},\n`)
                                .reduce((acc, el) => acc + el);
    } 

    /**
    * Salva la classe nel percorso specificato
    * @param path 
    * @returns 
    */
    public saveOnFileSystem(path: string): Promise<void>{
      const fileContent: string = this.getFileContentString();

      const finalPath: string = `${path}${path.endsWith('/')? '' : '/'}${this.fileName}`

      return fs.writeFile(finalPath, fileContent)
      .catch(err => Promise.reject(new CustomError(err, ERROR_CODES.ERR_SAVING_MODEL_FILE)))
    }



   /**
    * converte il tipo proveniente da inde in tipo sql (se il tipo non è standard, verrà ricercato all'interno del array enumTypes passato)
    * @param indeType tipo proveniente da inde
    * @returns 
    */
    static converToSqlType(indeType: INDE_TYPES  | string, enumTypes?: Record<string, any>[]): SQL_TYPES{

      let finalType: SQL_TYPES | null = null;
      let arTsTypes  = Object.keys(INDE_SQL_TYPES_MAP) as SQL_TYPES[];
      let isEnum = false;
      arTsTypes.forEach((key: SQL_TYPES, idx, other) => {
          
          if(INDE_SQL_TYPES_MAP[key].includes(indeType as INDE_TYPES))
              finalType = key;
      })

      if(finalType == null){
            // il valore è di tipo enum, dobbiamo decodificarlo

            //cerchiamo l'enum giusto nella lista di enums che abbiamo
            const typeWithoutCmp: string = indeType.split('.')[1];
            const objEnum = enumTypes?.find(el => el.$.Name == typeWithoutCmp);

            if(!!objEnum){
                //trovato! vediamo se l'enum dichiara il suo tipo
                if(!!objEnum.$.UnderlyingType){
                    // l'enum dichiara il suo tipo, dobbiamo trasformarlo in un tipo sql
                    //un po' di ricorsione ci sta sempre bene
                    finalType = SqlGenerator.converToSqlType(objEnum.$.UnderlyingType)
                }
                else{
                    // l'enum non dichiara il suo tipo, dobbiamo provare ad evincerlo dai valori
                    const firstMember = objEnum.Member[0].$.Value;
                    if(this.isNumeric(firstMember)){
                        finalType = 'REAL';
                    }
                    else{
                        finalType = 'TEXT'
                    }
                }

            }
            else{
                //non abbiamo trovato l'enum giusto, purtroppo non conosciamo il tipo
                finalType = 'UNKNOWN'
                isEnum = true;
            }
      }

      return finalType;
    }

    private static isNumeric(value: any): boolean{
        if(typeof value == 'number'){
            return true;
        }
        else if(typeof value == 'string'){
            //@ts-expect-error
            return !isNaN(value) && !isNaN(parseFloat(value))
        }
        else{
            return false
        }
    }
}



