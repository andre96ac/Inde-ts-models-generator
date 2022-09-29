import * as fs from 'fs/promises'
import { ERROR_CODES, TS_TYPES } from './utils.js';
export class ClassGenerator{

    private arProperties: ClassGeneratorProperty[] = [];

    private suppliedName: string = '';

    public initProperties: boolean = true;






    /**
     * Logica del nome classe: se nel nome fornito son presenti maiuscole isolate, si ipotizza camelcase, e quindi tutto resta invariato, tranne la prima lettera che viene messa in maiuscolo
     * Se non sono presenti maiuscole isolate, il nome viene messo tutto in minuscolo, tranne la prima lettera, che resta in maiuscolo
     * PIPPO => Pippo
     * pippo => Pippo
     * PIPPOPLUTO => Pippopluto
     * pippopluto => Pippopluto
     * pippoPluto => PippoPluto
     * 
     */
    private get className(): string{

        let isCamelCase = false;
        const strLength = this.suppliedName.length;
        let finalString = this.suppliedName;

        for(let i = 1; i< strLength-1; i++){
            if(this.isUppercase(this.suppliedName[i]) && !this.isUppercase(this.suppliedName[i-1]) && !this.isUppercase(this.suppliedName[i+1])){
                //abbiamo una maiuscola isolata, 
                isCamelCase = true
            }
        }

        if(!isCamelCase){
            //non ci sono maiuscole da salvare, metto tutto in minuscolo 
            finalString = finalString.charAt(0).toUpperCase() + finalString.substring(1).toLowerCase();
        }
        else{
            finalString = finalString.charAt(0).toUpperCase() + finalString.substring(1);
        }

        return finalString;

    }


    /**
     * Logica per il nome file: il nome viene sempre messo in minuscolo, ma se viene rilevato camelcase, le parole vengono spezzate con dei trattini
     * viene aggiunto .model.ts alla fine
     * PIPPO => pippo.model.ts
     * pippo => pippo.model.ts
     * PIPPOPLUTO => pippopluto.model.ts
     * pippopluto => pippopluto.model.ts
     * pippoPluto => pippo-pluto.model.ts
     */
    private get fileName(): string{

        let isCamelCase = false;
        const strLength = this.suppliedName.length;
        let finalString = this.suppliedName;

        let j = 1;
        for(let i = j; i< strLength-1; i++){
            if(this.isUppercase(this.suppliedName[i]) && !this.isUppercase(this.suppliedName[i-1]) && !this.isUppercase(this.suppliedName[i+1])){
                //abbiamo una maiuscola isolata, 
                isCamelCase = true

                finalString =`${finalString.substring(0, j)}-${finalString.substring(j)}`
                j++;
            }
            j++;
        }


        return `${finalString.toLowerCase()}.model.ts`;


    }



    private isUppercase(letter: string): boolean{
        return (letter === letter.toUpperCase());
    }

    private getInitValueForType(type: TS_TYPES): string{
        let returnValue = '';
        switch(type){
            case "Date":
                returnValue = " = new Date()";
            break;
            case "string":
                returnValue = ` = ''`;
            break;
            default: 
                returnValue = '';
            }
            return returnValue;
    }


    private getFileContentString(): string{
        const start = `export class ${this.className}{\n`  

        const end = `}`

        const properties: string = this.arProperties
        .map((el) => {
            return  `\t${el.private? 'private' : 'public'} ${el.name}${el.required? '': '?'}: ${el.type}${this.initProperties? this.getInitValueForType(el.type) : ''};\n`
        })
        .reduce((el, acc) => acc + el)


        return start + properties + end
    }


    
    public addProperty(name: string, type: TS_TYPES, required = false, privateField = false): void{
        if(!!name && name.length > 0 && !!type && type.length > 0 && required !== null && required !== undefined){
            this.arProperties.push({
                name: name,
                type: type,
                required: required,
                private: privateField
            })

        }
        else{
            console.warn(`Error, property ${name} ignored, not all parameters supplied`);
        }
    }


    public setName(className: string): void{
        if(!!className && className.length > 0){
            this.suppliedName = className.trim()
        }
    }


    public saveOnFileSystem(path: string): Promise<void>{
        const fileContent: string = this.getFileContentString();

        const finalPath: string = `${path}${path.endsWith('/')? '' : '/'}${this.fileName}`

        return fs.writeFile(finalPath, fileContent)
        .catch(err => Promise.reject({code: ERROR_CODES.ERR_SAVING_MODEL_FILE, error: err}))
    }
}



export interface ClassGeneratorProperty{
    name: string,
    type: TS_TYPES,
    required: boolean;
    private: boolean;
}