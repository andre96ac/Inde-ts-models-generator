
export enum ERROR_CODES{
    ERR_GENERIC = 1,
    ERR_SAVING_MODEL_FILE = 40,
    ERR_SAVING_ENUM_FILE = 41,
    ERR_READING_METADATA_FILE = 10,
    ERR_FETCHING_METADATA_URL = 20,
    ERR_PROCESSING_XML = 30,
    ERR_PARAMETERS = 50
}

export type INDE_TYPES = 
"Edm.Guid"      |//
"Edm.String"    |//
"Edm.Date"      |//
"Edm.DateTimeOffset" |//
"Edm.Decimal"   |//
"Edm.Binary"    |//
"Edm.TimeOfDay"    |//
"Edm.Double"    |//
"Edm.Int16"     |//
"Edm.Int32"     |//
"Edm.Boolean"   |
"Edm.Int64"     ;//


export type TS_TYPES = 
"number"    |
"string"    |
"Date"      |
"boolean"   ;

export type SQL_TYPES = 
"BLOB"      |
"INTEGER"   |
"REAL"      |
"NUMERIC"   |
"TEXT"      |
"UNKNOWN"

export const INDE_TS_TYPES_MAP: Record<TS_TYPES, INDE_TYPES[]> = {
    string: ["Edm.String", "Edm.Guid", "Edm.Binary"],
    number: ["Edm.Decimal", "Edm.Int16", "Edm.Int32", "Edm.Int64", "Edm.Double"],
    boolean: ["Edm.Boolean"],
    Date: ["Edm.Date", "Edm.DateTimeOffset", "Edm.TimeOfDay"]
}

export const INDE_SQL_TYPES_MAP: Record<SQL_TYPES, INDE_TYPES[]> = {
    TEXT: ["Edm.String", "Edm.Guid", "Edm.DateTimeOffset", "Edm.TimeOfDay", "Edm.Binary"],
    REAL: ["Edm.Decimal", "Edm.Double"],
    INTEGER: ["Edm.Boolean", "Edm.Int16", "Edm.Int32", "Edm.Int64"],
    BLOB: [],
    NUMERIC: ["Edm.Date"],
    UNKNOWN: []
}

export class CustomError extends Error{
    readonly errorCode: ERROR_CODES
    constructor(error: string | Error, code: ERROR_CODES = ERROR_CODES.ERR_GENERIC){
        if(error instanceof Error){
            super(error.message);
            this.stack = error.stack;
            this.name = error.name;
            this.errorCode = code;
        }
        else{
            super(error);
            
        }
        this.errorCode = code;
    }

}

export type PROP_ACCESSIBILTY = 'public'|'private'|'protected'