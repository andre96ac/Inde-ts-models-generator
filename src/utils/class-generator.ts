import * as fs from 'fs/promises'
import { CustomConfig } from './custom-config-interface.js';
import { EnumSingleGenerator } from './enum-generator.js';
import { ERROR_CODES, INDE_TS_TYPES_MAP, INDE_TYPES, CustomError, TS_TYPES, PROP_ACCESSIBILTY } from './various.js';
export class ClassGenerator{

    //proprietà della classe
    private arProperties: ClassGeneratorProperty[] = [];

    //nome fornito
    private suppliedName: string = '';

    //parametri di configurazione
    private params: CustomConfig;


    //array di importazioni da aggiungere
    private arImports: ClassGeneratorImport[] = [];


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
    public get className(): string{
        if(!this.params.normalizeClassNames){
            return this.suppliedName;

        }
        else{

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
    public get fileName(): string{

        if(!this.params.normalizeClassFilesNames){
            return `${this.suppliedName}.ts`
        }
        else{

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



    }

    private isUppercase(letter: string): boolean{
        return (letter === letter.toUpperCase());
    }

    private getInitValueForType(type: TS_TYPES | string): string{
        let returnValue = '';
        switch(type){
            case "Date":
                // returnValue = " = new Date()";
                returnValue = "";
            break;
            case "string":
                returnValue = ` = ''`;
            break;
            default: 
                returnValue = '';
            }
            return returnValue;
    }





    public constructor(name: string, config: CustomConfig){
        this.suppliedName = name;
        this.params = config;;
    }


    public addPrimaryKey(name: string, type: TS_TYPES, required = false, privateField: PROP_ACCESSIBILTY = 'public'): ClassGenerator{
        this.addProperty(name, type, required, privateField)
        return this;
    }


    
    public addProperty(name: string, type: TS_TYPES | string, required = false, accessibility: PROP_ACCESSIBILTY = 'public'): ClassGenerator{
        if(!!name && name.length > 0 && !!type && type.length > 0 && required !== null && required !== undefined){
            this.arProperties.push({
                name,
                type,
                required,
                accessibility
            })

        }
        else{
            console.warn(`Error, property ${name} ignored, not all parameters supplied`);
        }

        return this
    }

    /**
    * Aggiunge un elemento all'elenco di importazioni (se l'elemento è già stato aggiunto, viene ignorato)
    * @param tokenName 
    * @param path 
    */
    public addImport(tokenName: string, path: string): void{
        let added = false;
        if(!!tokenName && tokenName.length > 0 && !!path && path.length > 0){
            this.arImports.forEach(el => {
                if(el.sourcePathName == path){
                    // abbiamo già un import con lo stesso path, ma dobbiamo controllare che lo stesso token non sia già importato
                    if(!el.tokens.includes(tokenName)){
                        el.tokens.push(tokenName);
                        added = true;
                    }
                    else{
                        //token già presente, non faccio niente
                        added = true;
                    }

                }
            })
            if(!added){
                this.arImports.push({sourcePathName: path, tokens: [tokenName]})
            }

        }
        
    }
    
    

    /**
     * Restituisce il contenuto del file finito sotto forma di stringa
     * @returns 
     */
    public getFileContentString(): string{
        const start = `export class ${this.className} ${this.getInheritance()}{\n`  
        const end = `}`
        const properties = this.getPropertiesString();
        const imports = this.getImportsString();
        const constructor = this.getConstructor();
        const initMethod = this.getInitMethod();
        const factoryMethod = this.getFactoryMethod();
        const classNameMethod = this.getClassNameMethod();
        const remoteNameMethod = this.getRemoteNameMehtod();
        const accessorMethods = this.getAccessorMethods();

        
        return imports + start + properties + constructor + initMethod + factoryMethod + classNameMethod + remoteNameMethod + accessorMethods + end
    }

    //

    private getInheritance(): string{
        let extendPart: string = ''; 
        let implementsPart: string = ''; 

        if(!!this.params.extendClass && this.params.extendClass?.name?.length > 0 && this.params.extendClass?.importPath?.length >  0){
            extendPart = `extends ${this.params.extendClass.name} `;
            this.addImport(this.params.extendClass.name, this.params.extendClass.importPath)
        }
        if(!!this.params.extendInterfaces && this.params.extendInterfaces.length > 0){
            implementsPart = this.params.extendInterfaces
            .map(el => el.name)
            .reduce((acc, el, idx) => {
                if(el?.length > 0){
                    this.addImport(el, this.params.extendInterfaces[idx].importPath)
                    return`${acc}, ${el}`;
                }
                else{
                    return '';
                }
            })
            implementsPart = `implements ${implementsPart}`
        }
        return extendPart + implementsPart
    }

    private getPropertiesString(): string{
        const startRegion: string = this.params.regionAnnotations? '\t//#region PROPERTIES\n' : '';
        const endRegion: string = this.params.regionAnnotations? '\t//#endregion\n' : '';

        let properties: string = '';

        if(!! this.arProperties && this.arProperties.length > 0){
            properties = this.arProperties
            .map((el) => {
                return  `\t${el.accessibility} ${el.name}${el.required? '': '?'}: ${el.type}${(this.params.initProperties && this.params.initPropertiesMode == 'normal')? this.getInitValueForType(el.type) : ''};\n`
            })
            .reduce((el, acc) => acc + el)

            properties = startRegion +  properties + endRegion + '\n' + '\n'

        }
        return properties
    }


    private getImportsString(): string{
        return this.arImports.length > 0? this.arImports
                                                    .map(el => {
                                                        return  `import { ${el.tokens.map((token, idx) => `${token}, ` ).reduce((stringToken, acc) => (stringToken + acc)).slice(0, -2)} } from '${el.sourcePathName}'\n`
                                                    })
                                                    .reduce((el, acc) => el + acc)
                                                    .concat('\n\n') : '';
    }

    private getConstructor(): string{
        let finalString = '';

        if(this.params.initProperties && this.params.initPropertiesMode == 'constructor'){
            const start = `\tconstructor() {\n`
            const end = `\t}`

            const properties: string = this.arProperties.length > 0? this.arProperties
                                                .map(elProp => `\t\tthis.${elProp.name}${this.getInitValueForType(elProp.type)};\n`)
                                                .reduce((el, acc) => acc+el) : ''

            finalString = start + properties + end + '\n' + '\n'
        }

        return finalString;
    }
    private getInitMethod(): string{
        let finalString = '';

        if(this.params.initProperties && this.params.initPropertiesMode == 'initMethod'){
            const start = `\tinit() {\n`
            const end = `\t}`

            const properties: string = this.arProperties.length > 0? this.arProperties
                                                .map(elProp => `\t\tthis.${elProp.name}${this.getInitValueForType(elProp.type)};\n`)
                                                .reduce((el, acc) => acc+el): ''

            finalString = start + properties + end + "\n" + "\n"
        }

        return finalString;
    }

    private getAccessorMethods(): string{

        const startRegion: string = this.params.regionAnnotations? '\t//#region ACCESSORS\n' : '';
        const endRegion: string = this.params.regionAnnotations? '\t//#endregion \n' : '';

        let final = '';

        if(this.params.propertiesGetMethods || this.params.propertiesSetMethods){
            final = this.arProperties.map((elProp, idx) => {
                const finalPropName = elProp.name.substring(1, elProp.name.length);

                const getMethod: string = this.params.propertiesGetMethods? `\tpublic get ${finalPropName}(){return this.${elProp.name}}\n` : ``
                const setMethod: string = this.params.propertiesSetMethods? `\tpublic set ${finalPropName}(value){this.${elProp.name} = value}\n` : ``

                return getMethod + setMethod + ((idx < this.arProperties.length - 1)? '\n' : '');
            })
            .reduce((el, acc) => el + acc);

        }

        return startRegion + final + endRegion + '\n';

    }


    private getFactoryMethod(): string{
        if(this.params.getFactoryMethod){

            return `\tgetFactory(): typeof ${this.className}{
        return ${this.className}
    }\n\n`
        }
        else {
            return '';
        }
    }
    private getClassNameMethod(): string{
        if(this.params.getFactoryMethod){

            return `\tgetClassName(): string{
        return '${this.className}'
    }\n\n`
        }
        else {
            return '';
        }
    }

    private getRemoteNameMehtod(): string{
        if(this.params.getFactoryMethod){

            return `\tgetRemoteName(): string{
        return '${this.suppliedName}'
    }\n\n`
        }
        else {
            return '';
        }
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
    * converte il tipo proveniente da inde in tipo typescript (se il tipo non è standard, si suppone sia un enum)
    * @param indeType tipo proveniente da inde
    * @returns 
    */
    static converToTsType(indeType: INDE_TYPES | string): {finalType: TS_TYPES | string, isEnum: boolean}{

        let finalType: TS_TYPES | string | null = null;
        let arTsTypes  = Object.keys(INDE_TS_TYPES_MAP) as TS_TYPES[];
        let isEnum = false;
        arTsTypes.forEach((key: TS_TYPES, idx, other) => {
            
            if(INDE_TS_TYPES_MAP[key].includes(indeType as INDE_TYPES))
                finalType = key;
        })

        if(finalType == null){
                // si suppone che il tipo sia un enum, tolgo i punti e prendo solo l'ultima parte
                finalType = EnumSingleGenerator.normalizeEnumName(indeType)
                isEnum = true;
        }

        return {finalType, isEnum};
    }
}



export interface ClassGeneratorProperty{
    name: string,
    type: TS_TYPES | string,
    required: boolean;
    accessibility: PROP_ACCESSIBILTY;
}


export interface ClassGeneratorImport{
    tokens: string[];
    sourcePathName: string;
}

