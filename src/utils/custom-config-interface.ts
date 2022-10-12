export interface CustomConfig{
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
    propertiesCustomPrefix: string,
    // transform generated class names in a Camelized Way
    normalizeClassNames: boolean,
    // fix generated files names in a "- separated" way
    normalizeClassFilesNames: boolean,
    // set true if you want to add ".js" at the end of generated import paths
    importsPathExtension: boolean,
    // whitelist of components to use ( [] => only main app, [*] => all, ["comp1", "comp2"] => only specified )
    componentsWhiteList: string[]

}