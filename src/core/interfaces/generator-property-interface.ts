import { PROP_ACCESSIBILTY, SQL_TYPES, TS_TYPES } from "../various";

export interface ClassGeneratorProperty{
    name: string,
    type: TS_TYPES | string,
    required: boolean;
    accessibility: PROP_ACCESSIBILTY;
    isPrimary: boolean
}

export interface SqlGeneratorProperty{
    name: string,
    type: SQL_TYPES,
    required: boolean;
    isPrimary: boolean
}