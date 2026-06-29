import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"



const generateAccessAndRefreshTokens = async(userId) => {
    try{

        //  console.log("userId =", userId)

        const user = await User.findById(userId)
        // console.log("user =", user)

        const accessToken = user.generateAccessToken()

        // console.log("access token generated")

        const refreshToken = user.generateRefreshToken()
        //  console.log("refresh token generated")

        user.refreshToken = refreshToken

        await user.save({validateBeforeSave:false})
        

        return {accessToken,refreshToken}


    }catch(error){
        // console.log("TOKEN ERROR =>", error)
        throw new ApiError(500,"Something went wrong while generating refresh and access token")
    }
}

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


const loginUser = asyncHandler(async (req,res) =>{
        //req body -> data
        //username or email
        //find the user in db
        //password check
        //access and refresh token
        //send cookie

        const {email,username,password} = req.body
        console.log(email);

        if(!username && !email){
            throw new ApiError(400,"username or email is required")
        }
        

        const user = await User.findOne({
            $or:[{username},{email}]
        })



        if(!user){
            throw new ApiError(404,"User does not exist")
        }


        const isPasswordValid = await user.isPasswordCorrect(password)

        if(!isPasswordValid){
            throw new ApiError(401,"Invalid user credentials")
        }

        const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

        const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }
        return res.status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,accessToken,
                    refreshToken

                },
                "User logged in Successfully"
            )
        )
})  


const logoutUser = asyncHandler(async(req,res) => {
 await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )
    const options = {
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("accessToken",options)
        .json(new ApiResponse(200,{},"User logged Out"))
})


const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.
    refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token")
        }
    
        if(incomingRefreshToken !== user?.RefreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken,newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,error?.message || 
            "Invalid refresh token")
    }
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}