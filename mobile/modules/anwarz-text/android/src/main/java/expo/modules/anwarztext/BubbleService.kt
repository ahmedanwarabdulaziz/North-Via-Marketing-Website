package expo.modules.anwarztext

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.content.res.Configuration
import android.view.HapticFeedbackConstants
import android.widget.LinearLayout
import java.lang.ref.WeakReference
import java.text.DateFormat
import java.util.Date
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import kotlin.math.abs
import kotlin.math.hypot

/**
 * The floating Anwarz bubble: a small round button drawn over every app ("Display over other apps").
 * Tap it to open the writing panel (ProcessTextActivity in "compose" mode): type or paste, pick a
 * writing mode, Copy & close, paste anywhere. Drag it around; drop it on the ✕ at the bottom to turn
 * it off. Android requires a small notification while it runs; tapping that notification also opens
 * the panel, and its "Turn off" button stops the bubble.
 * Long press: a menu with Write · Speak · Quick task · Ask Anwarz · Hide for 1 hour · Turn off.
 * A red badge shows how many urgent alerts wait (set by the app: AnwarzText.setBubbleBadge).
 */
class BubbleService : Service() {
  companion object {
    private const val CHANNEL = "anwarz_bubble"
    private const val NOTIFICATION_ID = 4711
    const val ACTION_STOP = "expo.modules.anwarztext.STOP_BUBBLE"
    const val ACTION_SHOW = "expo.modules.anwarztext.SHOW_BUBBLE"
    private const val PREFS = "anwarz_bubble"
    private const val HIDE_MS = 60 * 60 * 1000L

    @Volatile
    var running = false
      private set

    @Volatile
    private var instance: WeakReference<BubbleService>? = null

    /** The panel in one of its modes: compose (Write), speak, task, ask. */
    fun panelIntent(context: Context, action: String): Intent =
      Intent(context, ProcessTextActivity::class.java).apply {
        putExtra(ProcessTextActivity.EXTRA_ACTION, action)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_MULTIPLE_TASK)
      }

    /** The writing panel in "compose" mode (empty text box). */
    fun composeIntent(context: Context): Intent = panelIntent(context, "compose")

    /** The red number on the bubble (urgent alerts waiting); 0 hides it. Kept for the next start too. */
    fun setBadge(context: Context, count: Int) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putInt("badge", count.coerceAtLeast(0)).apply()
      instance?.get()?.let { service -> service.handler.post { service.updateBadge() } }
    }

    fun canDraw(context: Context) = Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context)
  }

  private lateinit var windowManager: WindowManager
  private var bubble: View? = null
  private var bubbleParams: WindowManager.LayoutParams? = null
  private var trash: View? = null
  private var badge: TextView? = null
  private var menu: View? = null
  private var hidden = false
  private var hiddenUntil = 0L
  val handler = Handler(Looper.getMainLooper())
  private val showAgain = Runnable { show() }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    instance = WeakReference(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP || !canDraw(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    startInForeground()
    if (bubble == null) showBubble()
    if (intent?.action == ACTION_SHOW) show()
    running = true
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    handler.removeCallbacksAndMessages(null)
    if (instance?.get() === this) instance = null
    removeView(menu)
    removeView(trash)
    if (!hidden) removeView(bubble)
    trash = null
    bubble = null
    super.onDestroy()
  }

  // ---------- Notification (required for a service that keeps running) ----------

  private fun startInForeground() {
    val notification = buildNotification()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun refreshNotification() {
    try {
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).notify(NOTIFICATION_ID, buildNotification())
    } catch (_: Exception) {
    }
  }

  private fun buildNotification(): Notification {
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(CHANNEL) == null) {
      manager.createNotificationChannel(
        NotificationChannel(CHANNEL, "Writing bubble", NotificationManager.IMPORTANCE_MIN).apply {
          description = "Shown while the Anwarz writing bubble is on"
          setShowBadge(false)
        }
      )
    }
    val immutable = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
    val open = PendingIntent.getActivity(this, 1, composeIntent(this), PendingIntent.FLAG_UPDATE_CURRENT or immutable)
    val stop = PendingIntent.getService(this, 2, Intent(this, BubbleService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_UPDATE_CURRENT or immutable)
    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    builder
      .setSmallIcon(android.R.drawable.ic_menu_edit)
      .setContentTitle(if (hidden) "Anwarz bubble hidden until ${DateFormat.getTimeInstance(DateFormat.SHORT).format(Date(hiddenUntil))}" else "Anwarz writing bubble is on")
      .setContentText("Tap to write a reply")
      .setContentIntent(open)
      .setOngoing(true)
    if (hidden) {
      val showNow = PendingIntent.getService(this, 4, Intent(this, BubbleService::class.java).setAction(ACTION_SHOW), PendingIntent.FLAG_UPDATE_CURRENT or immutable)
      builder.addAction(Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this, android.R.drawable.ic_menu_view), "Show now", showNow).build())
    }
    builder.addAction(Notification.Action.Builder(android.graphics.drawable.Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Turn off", stop).build())
    return builder.build()
  }

  // ---------- The bubble ----------

  private fun dp(value: Int) = TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

  private fun overlayType() =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    else @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE

  private fun screenSize(): Pair<Int, Int> {
    val metrics = resources.displayMetrics
    return Pair(metrics.widthPixels, metrics.heightPixels)
  }

  @SuppressLint("ClickableViewAccessibility")
  private fun showBubble() {
    createTrash() // added first, so the bubble is always drawn above it
    val size = dp(54)
    val view = FrameLayout(this).apply {
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor("#274290"))
        setStroke(dp(2), Color.WHITE)
      }
      elevation = dp(6).toFloat()
      contentDescription = "Anwarz: write a reply"
      val icon = ImageView(context).apply {
        setImageDrawable(packageManager.getApplicationIcon(packageName))
        scaleType = ImageView.ScaleType.CENTER_CROP
        clipToOutline = true
        outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
        background = GradientDrawable().apply { shape = GradientDrawable.OVAL; setColor(Color.TRANSPARENT) }
      }
      addView(icon, FrameLayout.LayoutParams(size - dp(8), size - dp(8), Gravity.CENTER))
      val count = TextView(context).apply {
        setTextColor(Color.WHITE)
        textSize = 10f
        gravity = Gravity.CENTER
        includeFontPadding = false
        background = GradientDrawable().apply {
          shape = GradientDrawable.OVAL
          setColor(Color.parseColor("#E53935"))
          setStroke(dp(1), Color.WHITE)
        }
        visibility = View.GONE
      }
      addView(count, FrameLayout.LayoutParams(dp(19), dp(19), Gravity.TOP or Gravity.END))
      badge = count
    }
    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val (width, height) = screenSize()
    val params = WindowManager.LayoutParams(
      size,
      size,
      overlayType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = prefs.getInt("x", width - size - dp(4))
      y = prefs.getInt("y", (height * 0.35).toInt())
    }

    val slop = ViewConfiguration.get(this).scaledTouchSlop
    var downX = 0f
    var downY = 0f
    var startX = 0
    var startY = 0
    var dragging = false
    var longPressed = false
    val longPress = Runnable {
      longPressed = true
      view.alpha = 1f
      view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
      showMenu()
    }
    view.setOnTouchListener { v, event ->
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX
          downY = event.rawY
          startX = params.x
          startY = params.y
          dragging = false
          longPressed = false
          v.alpha = 0.85f
          if (menu != null) dismissMenu()
          handler.postDelayed(longPress, ViewConfiguration.getLongPressTimeout().toLong())
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - downX
          val dy = event.rawY - downY
          if (!dragging && !longPressed && (abs(dx) > slop || abs(dy) > slop)) {
            dragging = true
            handler.removeCallbacks(longPress)
            showTrash()
          }
          if (dragging) {
            params.x = (startX + dx).toInt()
            params.y = (startY + dy).toInt()
            safeUpdate(v, params)
            trash?.scaleX = if (overTrash(params, size)) 1.3f else 1f
            trash?.scaleY = trash?.scaleX ?: 1f
          }
          true
        }
        MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
          v.alpha = 1f
          handler.removeCallbacks(longPress)
          if (longPressed) {
            // the menu is open
          } else if (!dragging) {
            if (event.actionMasked == MotionEvent.ACTION_UP) openPanel()
          } else {
            val dropOnTrash = overTrash(params, size)
            hideTrash()
            if (dropOnTrash) {
              stopSelf()
            } else {
              // Snap to the nearest side, keep it on screen.
              val (w, h) = screenSize()
              params.x = if (params.x + size / 2 < w / 2) dp(4) else w - size - dp(4)
              params.y = params.y.coerceIn(dp(24), h - size - dp(48))
              safeUpdate(v, params)
              prefs.edit().putInt("x", params.x).putInt("y", params.y).apply()
            }
          }
          true
        }
        else -> false
      }
    }
    try {
      windowManager.addView(view, params)
      bubble = view
      bubbleParams = params
      updateBadge()
    } catch (_: Exception) {
      stopSelf() // the permission was taken away
    }
  }

  private fun openPanel(action: String = "compose") {
    try {
      startActivity(panelIntent(this, action))
    } catch (_: Exception) {
      // nothing to do: Android refused to open it
    }
  }

  fun updateBadge() {
    val count = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("badge", 0)
    badge?.apply {
      text = if (count > 99) "99+" else count.toString()
      visibility = if (count > 0) View.VISIBLE else View.GONE
    }
  }

  // ---------- Hide for an hour ----------

  private fun hideForAnHour() {
    val b = bubble ?: return
    if (hidden) return
    removeView(b)
    hidden = true
    hiddenUntil = System.currentTimeMillis() + HIDE_MS
    handler.removeCallbacks(showAgain)
    handler.postDelayed(showAgain, HIDE_MS)
    refreshNotification()
  }

  private fun show() {
    handler.removeCallbacks(showAgain)
    if (!hidden) return
    val b = bubble ?: return
    val p = bubbleParams ?: return
    try {
      windowManager.addView(b, p)
      hidden = false
      updateBadge()
    } catch (_: Exception) {
    }
    refreshNotification()
  }

  // ---------- Long-press menu ----------

  @SuppressLint("ClickableViewAccessibility")
  private fun showMenu() {
    if (menu != null) return
    val p = bubbleParams ?: return
    val night = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
    val ink = if (night) Color.parseColor("#F1F3F8") else Color.parseColor("#11131A")
    val width = dp(210)
    val list = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(6), dp(6), dp(6), dp(6))
      elevation = dp(8).toFloat()
      background = GradientDrawable().apply {
        cornerRadius = dp(16).toFloat()
        setColor(if (night) Color.parseColor("#181B24") else Color.WHITE)
        setStroke(dp(1), if (night) Color.parseColor("#2A2F3B") else Color.parseColor("#E3E5EB"))
      }
    }
    fun item(label: String, onTap: () -> Unit) {
      list.addView(
        TextView(this).apply {
          text = label
          textSize = 16f
          setTextColor(ink)
          setPadding(dp(14), dp(12), dp(14), dp(12))
          setOnClickListener {
            dismissMenu()
            onTap()
          }
        },
        LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
      )
    }
    item("✍️  Write a reply") { openPanel("compose") }
    item("🎙  Speak") { openPanel("speak") }
    item("📌  Quick task") { openPanel("task") }
    item("💬  Ask Anwarz") { openPanel("ask") }
    item("😴  Hide for 1 hour") { hideForAnHour() }
    item("✕  Turn off") { stopSelf() }

    val (w, h) = screenSize()
    val size = dp(54)
    val onRight = p.x + size / 2 > w / 2
    val params = WindowManager.LayoutParams(
      width,
      WindowManager.LayoutParams.WRAP_CONTENT,
      overlayType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = if (onRight) p.x - width - dp(8) else p.x + size + dp(8)
      y = p.y.coerceIn(dp(24), (h - dp(340)).coerceAtLeast(dp(24)))
    }
    list.setOnTouchListener { _, event ->
      if (event.actionMasked == MotionEvent.ACTION_OUTSIDE) {
        dismissMenu()
        true
      } else false
    }
    try {
      windowManager.addView(list, params)
      menu = list
    } catch (_: Exception) {
    }
  }

  private fun dismissMenu() {
    removeView(menu)
    menu = null
  }

  private fun safeUpdate(v: View, params: WindowManager.LayoutParams) {
    try {
      windowManager.updateViewLayout(v, params)
    } catch (_: Exception) {
    }
  }

  // ---------- The ✕ drop target while dragging ----------

  private fun trashCenter(): Pair<Int, Int> {
    val (w, h) = screenSize()
    return Pair(w / 2, h - dp(110))
  }

  private fun overTrash(params: WindowManager.LayoutParams, size: Int): Boolean {
    val (cx, cy) = trashCenter()
    return hypot((params.x + size / 2 - cx).toDouble(), (params.y + size / 2 - cy).toDouble()) < dp(70)
  }

  /** The ✕ is its own overlay window, added once (hidden) before the bubble and shown while dragging. */
  private fun createTrash() {
    if (trash != null) return
    val size = dp(58)
    val view = TextView(this).apply {
      text = "✕"
      textSize = 22f
      setTextColor(Color.WHITE)
      gravity = Gravity.CENTER
      visibility = View.GONE
      background = GradientDrawable().apply {
        shape = GradientDrawable.OVAL
        setColor(Color.parseColor("#CCC62828"))
      }
    }
    val (cx, cy) = trashCenter()
    val params = WindowManager.LayoutParams(
      size,
      size,
      overlayType(),
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
      x = cx - size / 2
      y = cy - size / 2
    }
    try {
      windowManager.addView(view, params)
      trash = view
    } catch (_: Exception) {
    }
  }

  private fun showTrash() {
    trash?.visibility = View.VISIBLE
  }

  private fun hideTrash() {
    trash?.apply {
      visibility = View.GONE
      scaleX = 1f
      scaleY = 1f
    }
  }

  private fun removeView(view: View?) {
    if (view == null) return
    try {
      windowManager.removeView(view)
    } catch (_: Exception) {
    }
  }
}
