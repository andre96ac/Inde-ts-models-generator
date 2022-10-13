<br>
<br>

<img src="./inde.png">

<br>
<br>

# Inde-ts-models-generator



Single-command script to generate angular-style classes (*.model.ts) starting from Instant developer api $metadata descriptor

<br>
<br>

## Installation
<hr>

If you want to use function directly in your code, you can install the package locally

```bash
    npm i --save inde-ts-models-generator 
```

If you want to use it direcly from terminal, install it globally istead

```bash
    npm i -g inde-ts-models-generator
```


<br>
<br>



## Usage
<hr>
<br>

### Single command usage
to generate files, simply run 
```bash
    inde-ts-models generate -u https://my-application.aspx/$metadata
```
where "-u" option is the url of your Instant Developer application where $metadata informations are exposed.

<br>

Alternatively, you can provide a filesystem path of a xml file containing the $metadata infos

```bash
    inde-ts-models generate -f ./my-metadata-file.xml
```


Optionally, you can provide a configuration file path, where you can specify more config options (see "Configuration" section below for more infos)

```bash
    inde-ts-models generate -u {{METADATA URL}} -c ./configuration.json
```







<br>


### Code usage

> Coming Soon 



<br>


### Configuration

Optionally, with "-c" option, you can provide a configuration file in json format, which allow you to customize the script behavior. 

##### In any case, remember that the options provided via command line will take precedence over those in the configuration file


Here you can see the expected config file structure:

```typescript
    {
        //Set true if you want all the non primitive properties initialized
        initProperties: boolean;
        //set if you want the properties inizialized at declaration, inside the constructor, or in a specific method ("initProperties" must be true)
        initPropertiesMode: 'normal' | 'constructor' | 'initMethod';
        //set true if you want to generatye a getFactory method which returns the prototype of the class 
        getFactoryMethod: boolean;
        //set true if you want to generatye a getClassName method which returns the name of the class
        getClassNameMethod: boolean;
        //set true if you want to generatye a getRemoteEntityName method which returns the name of the entity incoming from instant developer
        getRemoteEntityNameMethod: boolean;
        // set the default accessibility for the generated properties
        propertiesAccessibility: 'private' | 'public' | 'protected';
        // add a custom string prefix to all generated properties names
        propertiesCustomPrefix: string;
        // transform generated class names in a Camelized Way
        normalizeClassNames: boolean;
        // fix generated files names in a "- separated" way
        normalizeClassFilesNames: boolean;
        // set true if you want to add ".js" at the end of generated import paths
        importsPathExtension: boolean;
        // whitelist of components to use ( null => only main app, [*] => all, ["comp1", "comp2"] => only specified )
        componentsWhiteList: string[] | null;
        // directory where to create the "model" folder
        outDir: string;
    }   
```

 and this is an example containing the default data
```json
{
    "initProperties": true, 
    "initPropertiesMode": "normal",
    "getFactoryMethod": true,
    "getClassNameMethod": true,
    "getRemoteEntityNameMethod": true,
    "propertiesAccessibility": "private",
    "propertiesCustomPrefix": "",
    "normalizeClassNames": true,
    "normalizeClassFilesNames": true,
    "importsPathExtension": true,
    "componentsWhiteList": ["*"],
    "outDir": "./"
}
```



