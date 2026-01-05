if(NOT TARGET react-native-vision-camera::VisionCamera)
add_library(react-native-vision-camera::VisionCamera SHARED IMPORTED)
set_target_properties(react-native-vision-camera::VisionCamera PROPERTIES
    IMPORTED_LOCATION "/home/ayush/Desktop/tokpay basic app/wallet/node_modules/react-native-vision-camera/android/build/intermediates/cxx/Debug/4550442j/obj/x86/libVisionCamera.so"
    INTERFACE_INCLUDE_DIRECTORIES "/home/ayush/Desktop/tokpay basic app/wallet/node_modules/react-native-vision-camera/android/build/headers/visioncamera"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

