package expo.modules.novasaf

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Keeps read access to a document the user picked, so the content:// URI still works after the
 * app restarts. Android only allows this when the picker granted a *persistable* permission;
 * if it did not, takePersistableUriPermission throws and we report false instead of failing.
 */
class NovaSafModule : Module() {
  private val resolver
    get() = appContext.reactContext?.contentResolver
      ?: throw IllegalStateException("No Android context available")

  override fun definition() = ModuleDefinition {
    Name("NovaSaf")

    // true = access will survive restarts; false = Android refused to persist it.
    AsyncFunction("persistReadAccess") { uri: String ->
      try {
        resolver.takePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION)
        true
      } catch (e: SecurityException) {
        false
      }
    }

    // true = Android still lists this URI among the ones this app may read.
    AsyncFunction("hasReadAccess") { uri: String ->
      val parsed = Uri.parse(uri)
      resolver.persistedUriPermissions.any { it.uri == parsed && it.isReadPermission }
    }

    // true = this phone reports picture-in-picture support (Android 8+ and the system feature).
    AsyncFunction("isPictureInPictureSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        (appContext.reactContext?.packageManager
          ?.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE) ?: false)
    }

    AsyncFunction("releaseReadAccess") { uri: String ->
      try {
        resolver.releasePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION)
      } catch (e: SecurityException) {
        // Already gone; nothing to release.
      }
    }
  }
}
