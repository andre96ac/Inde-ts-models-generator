export interface CustomConfig{
    initProperties: boolean; //Set if 
    initPropertiesMode: 'normal' | 'constructor' | 'initMethod';
    getFactoryMethod: boolean;
    getClassNameMethod: boolean;
    getRemoteEntityNameMethod: boolean;
    propertiesAccessibility: 'private' | 'public' | 'protected';
    propertiesCustomPrefix: string,
    normalizeClassNames: boolean,
    normalizeClassFilesNames: boolean,
    importsPathExtension: boolean



}