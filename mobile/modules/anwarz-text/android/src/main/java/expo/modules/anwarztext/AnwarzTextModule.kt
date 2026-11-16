package expo.modules.anwarztext

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AnwarzTextModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AnwarzText")

    /** Closes the Correct / Rephrase panel; with text, it replaces the selection in the other app. */
    Function("finish") { text: String? ->
      val activity = ProcessTextActivity.current?.get() ?: return@Function false
      activity.runOnUiThread { activity.finishWith(text) }
      true
    }
  }
}
