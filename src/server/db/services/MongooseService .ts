import mongoose from 'mongoose'


export class MongooseService {
    private model: mongoose.Model<any>;

    constructor(Model: mongoose.Model<any>) {
        this.model = Model;
    }

    aggregate(pipeline: any): Promise<any> {
        return this.model.aggregate(pipeline).exec();
    }
    create(body: any): Promise<any> {
        return this.model.create(body);
    }
    count(query: any): Promise<any> {
        return this.model.count(query).exec();
    }
    delete(id: any): Promise<any> {
        return this.model.findByIdAndDelete(id).exec();
    }
    findDistinct(query: any, field: any): Promise<any> {
        return this.model
            .find(query)
            .distinct(field)
            .exec();
    }
    findOne(query: any, projection: object = { __v: 0 }, options: object = { lean: true }): Promise<any> {
        return this.model
            .findOne(query, projection, options)
            .select({ __v: 0 })
            .exec();
    }
    find(query: any, projection: object = { __v: 0 }, sort: object = { id: 1 }, options: object = { lean: true }): Promise<any> {
        return this.model
            .find(query, projection, options)
            .sort(sort)
            .select({ __v: 0 })
            .exec();
    }
    findById(id: any, projection: object = { __v: 0 }, options: object = { lean: true }): Promise<any> {
        return this.model
            .findById(id, projection, options)
            .exec();
    }
    update(id: any, body: any, options: object = { lean: true, new: true }): Promise<any> {
        return this.model
            .findByIdAndUpdate(id, body, options)
            .exec();
    }
}
