# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Preserve Capacitor core classes and interfaces
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class * implements com.getcapacitor.Plugin { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.PluginMethod public *;
}

# Preserve JavaScript interface methods for WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve Capacitor SQLite community plugin and SQLite drivers
-keep class com.getcapacitor.community.database.sqlite.** { *; }
-dontwarn com.getcapacitor.community.database.sqlite.**

# Preserve line numbers for stack trace deobfuscation
-keepattributes SourceFile,LineNumberTable
