// Now, we are using the promise

const asyncHandler = (requestHandler)=>{
    (req,res,next)
    
}

export {asyncHandler}







// This one async function using try and catch method
// const asynchandler = (fn)=> async (req, res, next) =>{

//     try {
        
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }