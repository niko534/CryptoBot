import mongoose from "mongoose";

export interface SuccessResult<T> {
    success: true
    result: T
}

export interface ErrorResult {
    success: false
    error: any
}

export type GeneralRepoActionResult<T> = SuccessResult<T> | ErrorResult
export type BooleanRepoActionResult = { success: boolean, error?: any }

// Not sure about the types
export interface IRepo<T> {
    update(id: any, body: T): Promise<GeneralRepoActionResult<T>>
    deleteById(id: any): Promise<BooleanRepoActionResult>
    dropAllDocuments(): Promise<BooleanRepoActionResult>
}

export interface ICreationRepo<T> {
    create(data: Omit<T, '_id' | 'id'>): Promise<GeneralRepoActionResult<T>>
}