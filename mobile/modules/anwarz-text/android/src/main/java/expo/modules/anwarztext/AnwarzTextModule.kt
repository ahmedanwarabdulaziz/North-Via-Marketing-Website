package expo.modules.anwarztext

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AnwarzTextModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw IllegalStateException("No Android context")

  override fun definition() = ModuleDefinition {
    Name("AnwarzText")

    /** Closes the Correct / Rephrase panel; with text, it replaces the selection in the other app. */
    Function("finish") { text: String? ->
      val activity = ProcessTextActivity.current?.get() ?: return@Function false
      activity.runOnUiThread { activity.finishWith(text) }
      true
    }

    // ---------- The floating writing bubble (BubbleService) ----------

    /** Whether "Display over other apps" is allowed for Anwarz. */
    Function("canDrawOverlays") { BubbleService.canDraw(context) }

    /** Opens Android's "Display over other apps" page for Anwarz. */
    Function("openOverlaySettings") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    /** Shows the bubble (false when the permission isn't given yet). */
    Function("startBubble") {
      if (!BubbleService.canDraw(context)) return@Function false
      ContextCompat.startForegroundService(context, Intent(context, BubbleService::class.java))
      true
    }

    Function("stopBubble") {
      if (BubbleService.running) context.startService(Intent(context, BubbleService::class.java).setAction(BubbleService.ACTION_STOP))
      true
    }

    Function("isBubbleOn") { BubbleService.running }

    /** The red number on the bubble: urgent alerts waiting (0 hides it). */
    Function("setBubbleBadge") { count: Int ->
      BubbleService.setBadge(context, count)
      true
    }

    /** Opens the writing panel with an empty text box (the same as tapping the bubble). */
    Function("openComposer") {
      context.startActivity(BubbleService.composeIntent(context))
      true
    }
  }
}
