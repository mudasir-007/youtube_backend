import mongoose from "mongoose"
export const connectDB= async ()=>{
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Data Base connected Seccessfully")
    }
    catch(error){
        console.log((error.message))
        throw new Error ("something went wrong")
    }
}
export default connectDB;