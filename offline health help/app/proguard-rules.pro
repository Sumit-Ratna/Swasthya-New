# Proguard rules for Offline Health Help
-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.* <methods>;
}
