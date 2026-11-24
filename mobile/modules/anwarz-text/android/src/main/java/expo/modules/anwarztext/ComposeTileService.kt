package expo.modules.anwarztext

import android.app.PendingIntent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * "Anwarz ✍️" in the quick-settings panel (pull down twice, next to Wi-Fi and the flashlight; add it
 * with the pencil ✏️ there). Opens the writing panel in "compose" mode over whatever app is open.
 */
class ComposeTileService : TileService() {
  override fun onStartListening() {
    super.onStartListening()
    qsTile?.apply {
      state = Tile.STATE_INACTIVE
      updateTile()
    }
  }

  override fun onClick() {
    super.onClick()
    val open = Runnable {
      val intent = BubbleService.composeIntent(this)
      if (Build.VERSION.SDK_INT >= 34) {
        startActivityAndCollapse(PendingIntent.getActivity(this, 3, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      } else {
        @Suppress("DEPRECATION")
        startActivityAndCollapse(intent)
      }
    }
    if (isLocked) unlockAndRun(open) else open.run()
  }
}
