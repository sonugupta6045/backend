import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const commentSchems = new Schema ({
    content : {
        type: String,
        required: true
    },
    video:{
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    owner :{
        type: Schema.Types.ObjectId,
        ref:"User"
    }
},{timestamps:true})

commentSchems.plugin(mongooseAggregatePaginate)





export const Comment = mongoose.model("Comment",commentSchems)