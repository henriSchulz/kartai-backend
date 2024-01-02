export default class EntityStoreError extends Error {

    public readonly serverError: boolean;

    constructor(message: string, serverError: boolean) {
        super(message);
        this.name = "EntityStoreError";
        this.serverError = serverError;
    }
}