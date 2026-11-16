package expo.modules.anwarztext

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate
import java.lang.ref.WeakReference

/**
 * Opened from Android's text-selection menu ("Anwarz ✓ Correct" / "Anwarz ✨ Rephrase", two aliases of
 * this activity). It shows the JS component "ProcessText" with the selected text, and when the JS side
 * calls AnwarzText.finish(text) the new text goes back to the other app, replacing the selection.
 */
class ProcessTextActivity : ReactActivity() {
  companion object {
    const val COMPONENT = "ProcessText"
    var current: WeakReference<ProcessTextActivity>? = null
  }

  override fun getMainComponentName(): String = COMPONENT

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    val activity = this
    return object : DefaultReactActivityDelegate(activity, COMPONENT) {
      override fun getLaunchOptions(): Bundle {
        val intent = activity.intent
        val alias = intent.component?.className ?: ""
        return Bundle().apply {
          putString("text", intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString() ?: "")
          putBoolean("readonly", intent.getBooleanExtra(Intent.EXTRA_PROCESS_TEXT_READONLY, false))
          putString("action", if (alias.endsWith("CorrectText")) "correct" else "rephrase")
        }
      }
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
    current = WeakReference(this)
  }

  override fun onDestroy() {
    if (current?.get() === this) current = null
    super.onDestroy()
  }

  /** Sends the new text back (null = cancel) and closes the panel. */
  fun finishWith(text: String?) {
    if (text != null) {
      setResult(Activity.RESULT_OK, Intent().putExtra(Intent.EXTRA_PROCESS_TEXT, text))
    } else {
      setResult(Activity.RESULT_CANCELED)
    }
    finish()
  }
}
