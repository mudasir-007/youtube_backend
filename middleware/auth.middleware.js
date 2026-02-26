import jwt  from "jsonwebtoken";

export const checkAuth =async (req,res,next)=>{
    try{
        const token =req.headers.authorization?.split(" ")[1]
        if(!token){
            return res.status(401).json({
                error:"NO token provided"
            })
        }
        const decodedUser = jwt.verify(token, process.env.JWT_TOKEN);
        req.user=decodedUser;
        next();
    }
    catch(error){
        console.error(error);
        return res.status(401).json({
            error: "Invalid or expired token",
            message: error.message,
        }); 
    }
}
