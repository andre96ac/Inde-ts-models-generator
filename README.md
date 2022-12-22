<br>
<br>

<img src="./inde.png">

<br>
<br>

# Inde-ts-models-generator
Single-command script to generate angular-style model files (*.model.ts), or SQL table structure creation query, starting from Instant developer api $metadata descriptor

<br>


- [Inde-ts-models-generator](#inde-ts-models-generator)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Single command usage](#single-command-usage)
    - [Code usage](#code-usage)
        - [Sql files generation follow the model generator pattern; simply substitute ClassGenerator with SqlGenerator](#sql-files-generation-follow-the-model-generator-pattern-simply-substitute-classgenerator-with-sqlgenerator)
    - [Configuration](#configuration)
        - [NOTE: In any case, remember that the options provided via command line will take precedence over those in the configuration file](#note-in-any-case-remember-that-the-options-provided-via-command-line-will-take-precedence-over-those-in-the-configuration-file)
        - [NOTE: the names of getter and setter method will automatically truncate the first letter to avoid duplicates names. To get the correct behavior, please prefix properties names with a character using the option "propertiesCustomPrefix"](#note-the-names-of-getter-and-setter-method-will-automatically-truncate-the-first-letter-to-avoid-duplicates-names-to-get-the-correct-behavior-please-prefix-properties-names-with-a-character-using-the-option-propertiescustomprefix)




<br>
<br>

## Installation
<hr>

If you want to use the functions  in your code, you can install the package locally

```bash
    npm i --save inde-ts-models-generator 
```

If you want to use the script direcly from terminal, install it globally istead

```bash
    npm i -g inde-ts-models-generator
```


<br>
<br>



## Usage
<hr>
<br>

### Single command usage
to generate model files, simply run 
```bash
    inde-ts generate-models -u https://my-application.aspx/$metadata 
```

to generate sql files instead, run 
```bash
    inde-ts generate-sql -u https://my-application.aspx/$metadata 
```

where "-u" option is the url of your Instant Developer application where $metadata informations are exposed.

<br>

Alternatively, you can provide a filesystem path of a xml file containing the $metadata infos

```bash
    inde-ts-models generate -f ./my-metadata-file.xml
```


Optionally, you can provide a configuration file path, where you can specify more config options (see "Configuration" section below for more infos)

```bash
    inde-ts-models generate -u https://my-application.aspx/$metadata  -c ./configuration.json
```


>Please note: all options supplied via command line will take precedence of options in config file 





<br>


### Code usage

If you want, it is possible to use the prebuild functions to generate models programmatically

```typescript
import * as IndeGenerator from 'inde-ts-models-generator'

async function main(){

    //this follow the pattern of the config json file
    //Not all these properties will be used;

    const CONFIG: IndeGenerator.CustomConfigInterface.CustomConfig = {
        entitiesWhiteList: ["*"],
        componentsWhiteList: ["*"],
        outDir: "./",
        verbose: false,
        saveJsonToFile: false,
    
    
        initProperties: true, 
        initPropertiesMode: "normal",
        getFactoryMethod: true,
        getClassNameMethod: true,
        getRemoteEntityNameMethod: true,
        propertiesGetMethods: false,
        propertiesSetMethods: false,
        propertiesAccessibility: "private",
        propertiesCustomPrefix: "",
        normalizeClassNames: true,
        normalizeClassFilesNames: true,
        importsPathExtension: true,
        regionAnnotations: true,
        extendClass: null,
        extendInterfaces: [],
        getInitAllMethods: false,
        getKeyDescriptorMethod: false,
        
        compAsDbName: false,
        ifNotExistCondition: true,
        generateRowId: false,
        outputSingleFile: false
        
    }


    //Get the xml metadata
    const xmlMetadata: string = await IndeGenerator.loadMetadata('https://api.xxxx.com/$metadata')

    //Convert in JSON and clean, obtaining an array representing Instant Developer Project Components
    const arIndeComponents: Record<string, any>[] = await IndeGenerator.getComponentsArrayFromXml(xmlMetadata)

    //OPTIONALLY you can filter picking only components included in the filter array (this follow the config file sintax) 
    const filteredComponents: Record<string, any>[] = IndeGenerator.filterComponentsFromList(arIndeComponents, CONFIG.componentsWhiteList)

    //Getting Model Generator Objects; You have to make this for all components in "filteredComponents" Array
    const arTsClassesGenerators: IndeGenerator.ClassGenerator.ClassGenerator[] = IndeGenerator.createArTsClassesFromArEntityType(filteredComponents[0].EntityType, CONFIG)
    
    //Getting Enum Generator Object; You have to make this for all components in "filteredComponents" Array
    const enumGenerator: IndeGenerator.EnumGenerator.EnumListGenerator = IndeGenerator.createTsEnumGeneratorFromArEnumType(filteredComponents[0].EnumType, CONFIG)


    //Now you can get the result string representation
    const finalModelStrings: string [] = arTsClassesGenerators.map(el => el.getFileContentString())
    const finalEnumsString: string = await enumGenerator.getFinalStringRepresentation('');


    //...Or save them directly to files
    const PATH = './'
    Promise.all(arTsClassesGenerators.map(el => el.saveOnFileSystem(PATH)))
    .then(() => {console.log('Model files correctly created')})


    enumGenerator.saveToFile(PATH)
    .then(() => {console.log('Enum file correctly created')})

}


main()

```



<br>

It is also possible to use the ```IndeGenerator.ClassGenerator.ClassGenerator``` to generate arbitrary ts class files 

```typescript
   async function createArbitraryClass() {

    //Create the configuration object
    //Not all these properties will be used;
    const CONFIG: IndeGenerator.CustomConfigInterface.CustomConfig = {
        entitiesWhiteList: ["*"],
        componentsWhiteList: ["*"],
        outDir: "./",
        verbose: false,
        saveJsonToFile: false,
    
    
        initProperties: true, 
        initPropertiesMode: "normal",
        getFactoryMethod: true,
        getClassNameMethod: true,
        getRemoteEntityNameMethod: true,
        propertiesGetMethods: false,
        propertiesSetMethods: false,
        propertiesAccessibility: "private",
        propertiesCustomPrefix: "",
        normalizeClassNames: true,
        normalizeClassFilesNames: true,
        importsPathExtension: true,
        regionAnnotations: true,
        extendClass: null,
        extendInterfaces: [],
        getInitAllMethods: false,
        getKeyDescriptorMethod: false,
        
        compAsDbName: false,
        ifNotExistCondition: true,
        generateRowId: false,
        outputSingleFile: false

    }


    //Create the object
    const classFactory = new IndeGenerator.ClassGenerator.ClassGenerator('ClassName', CONFIG)


    //add properties
    classFactory.addProperty('propName', 'string', true, "private");

    // add imports
    classFactory.addImport('MY_ENUM', './my-enum.js')

    
    // get data string
    classFactory.getFileContentString();
    //save to file
    await classFactory.saveOnFileSystem('./path');
}



```

##### Sql files generation follow the model generator pattern; simply substitute ClassGenerator with SqlGenerator

<br>

### Configuration

Optionally, when executing the script from the CLI, with "-c" option you can provide a configuration file in json format, which allow you to customize the script behavior. 

##### NOTE: In any case, remember that the options provided via command line will take precedence over those in the configuration file


Here you can see the expected config file structure:



```typescript
    {
        //#region GENERICS
        
        //whitelist of components to use ( null => only main app, [*] => all, ["comp1", "comp2"] => only specified )
        componentsWhiteList: string[] | null;
        //whitelist of entities to use ( [*] => all, ["comp1", "comp2"] => only specified )
        entitiesWhiteList: string[] 
        //directory where to create the "model" or "sql" folder
        outDir: string;
        //enable verbose mode
        verbose: boolean;
        //save InDe generated json descriptor to file (used for test purposes)
        saveJsonToFile: boolean;
        //Url from which to retrieve the metadata (Warning: any url passed with the -u parameter takes precedence)
        sourceUrl: string | null;
        //FilePath from which to retrieve the metadata (Warning: any path passed with the -f parameter takes precedence)
        sourceFilePath: string | null;
    
        //#endregion
    
        //#region MODELS
    
        //Set true if you want all the non primitive properties initialized
        initProperties: boolean;
        //set if you want the properties inizialized at declaration, inside the constructor, or in a specific method ("initProperties" must be true)
        initPropertiesMode: 'normal' | 'constructor' | 'initMethod';
        //generate a method which inits all properties to null;
        getInitAllMethods: boolean;
        //generate a method which returns a string array containing the names of primary Key properties
        getKeyDescriptorMethod: boolean
        //set true if you want to generatye a getFactory method which returns the prototype of the class 
        getFactoryMethod: boolean;
        //set true if you want to generatye a getClassName method which returns the name of the class
        getClassNameMethod: boolean;
        //set true if you want to generatye a getRemoteEntityName method which returns the name of the entity incoming from instant developer
        getRemoteEntityNameMethod: boolean;
        //set true if you want to generate get methods for all properties
        propertiesGetMethods: boolean,
        //set true if you want to generate set methods for all properties
        propertiesSetMethods: boolean,
        // set the default accessibility for the generated properties (Private and protected properties will be automatically prefixed with a '_')
        propertiesAccessibility: 'private' | 'public' | 'protected';
        // add a custom string prefix to all generated properties names
        propertiesCustomPrefix: string;
        // transform generated class names in a Camelized Way
        normalizeClassNames: boolean;
        // fix generated files names in a "- separated" way
        normalizeClassFilesNames: boolean;
        // set true if you want to add ".js" at the end of generated import paths
        importsPathExtension: boolean;
        // generate region annotations (in form of //#region <...>    //endregion) to better divide generated code
        regionAnnotations: boolean;
        // a class from which models must inherit
        extendClass: {name: string, importPath: string} | null;
        // a list of interfaces which models must implements
        extendInterfaces: {name: string, importPath: string}[]
    
    
        //#endregion
    
    
        //#region SQL
    
        //add "if not exist" statement to table creation command
        ifNotExistCondition: boolean;
        //set false if you want to insert the "without rowid" statement to table creation command
        generateRowId: boolean;
        //set true if you want to prefix the table name with the component name as db name, following syntax "CREATE TABLE {{comp name}}.{{entity name}}..."
        compAsDbName: boolean;
        //generate all table creation instructions in one single file per component (every instruction separated by ';')
        outputSingleFile: boolean
    
        //#endregion
    }
```
##### NOTE: the names of getter and setter method will automatically truncate the first letter to avoid duplicates names. To get the correct behavior, please prefix properties names with a character using the option "propertiesCustomPrefix"  

<br>

 and this is an example containing the default config. You can supply all, or only some properties; the others will get values below:
```json
{
    "$schema": "./config-schema.json",
    "entitiesWhiteList": ["*"],
    "componentsWhiteList": ["*"],
    "outDir": "./",
    "verbose": false,
    "saveJsonToFile": false,
    "sourceUrl": null,
    "sourceFilePath": null,


    "initProperties": true, 
    "initPropertiesMode": "normal",
    "getFactoryMethod": true,
    "getClassNameMethod": true,
    "getRemoteEntityNameMethod": true,
    "propertiesGetMethods": false,
    "propertiesSetMethods": false,
    "propertiesAccessibility": "private",
    "propertiesCustomPrefix": "",
    "normalizeClassNames": true,
    "normalizeClassFilesNames": true,
    "importsPathExtension": true,
    "regionAnnotations": true,
    "extendClass": null,
    "extendInterfaces": [],
    "getInitAllMethods": false,
    "getKeyDescriptorMethod": false,
    
    "compAsDbName": false,
    "ifNotExistCondition": true,
    "generateRowId": false,
    "outputSingleFile": false

}
```

>if you want the intellisense when compiling the config json, simply first add "$schema" property, linking the config-schema.json file (you can find it in you local user node modules folder)



