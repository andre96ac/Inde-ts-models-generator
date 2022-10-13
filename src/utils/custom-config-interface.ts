export interface CustomConfig{
    //Set true if you want all the non primitive properties initialized
    initProperties: boolean;  //X
    //set if you want the properties inizialized at declaration, inside the constructor, or in a specific method ("initProperties" must be true)
    initPropertiesMode: 'normal' | 'constructor' | 'initMethod'; //X
    //set true if you want to generatye a getFactory method which returns the prototype of the class 
    getFactoryMethod: boolean; //X
    //set true if you want to generatye a getClassName method which returns the name of the class
    getClassNameMethod: boolean; //X
    //set true if you want to generatye a getRemoteEntityName method which returns the name of the entity incoming from instant developer
    getRemoteEntityNameMethod: boolean; //X
    // set the default accessibility for the generated properties
    propertiesAccessibility: 'private' | 'public' | 'protected'; //X
    // add a custom string prefix to all generated properties names
    propertiesCustomPrefix: string, //X
    // transform generated class names in a Camelized Way
    normalizeClassNames: boolean, //X
    // fix generated files names in a "- separated" way
    normalizeClassFilesNames: boolean, //X
    // set true if you want to add ".js" at the end of generated import paths
    importsPathExtension: boolean, //X
    // whitelist of components to use ( null => only main app, [*] => all, ["comp1", "comp2"] => only specified )
    componentsWhiteList: string[] | null, //X
    // directory where to create the "model" folder
    outDir: string;     //X

}