import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req,res)=>{
    //get user details from frontend
    //validation -not empty
    //check if user already exists:username or email
    //check for images, check for avatar
    //upload them to cloudinary,avatar
    //create user object-ceate entry in db
    //remove password and refresh token field from resposne
    //check for user creation
    //return res



    //1. res.body se extract kiye hai datapoints
    const{fullName,email,username,password} = req.body;
    // console.log("email: ",email);

    // if(fullName===""){
    //     throw new ApiError(400,"fullname is required")
    // }


    //2.check if all the datapoints are not empty
    if(
        [fullName,email,username,password].some((field)=>
        field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }



    //3.check whether the user is already existed or not with the extracted email or username
    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    // 4.if it do , then give error
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }


    // console.log(req.files);

    //5.local path of avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    //6. if avatar not found then throw error
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }


    //7.if avtar is found then upload on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    //8. if avtar is not uploaded then return error
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")

    }

   //9. create the user object
   const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    //10. remove the password and refreshtoken
    const createdUser = await User.findById(user._id).select(
        "-password  -refreshToken"
    )


    //11. if user is not created then thorw error
    if(!createdUser){
        throw new ApiError(500,"something went wrong while registering a user")
    }


    //12. return the response
    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered Successfully")
    )

})

export {registerUser}