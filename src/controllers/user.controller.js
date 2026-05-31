import {asyncHandler} from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req,res)=>{

    // console.log("register route hit")

    return res.status(200).json({
        message:"finally learn to use postman"
    })
})

export {registerUser}