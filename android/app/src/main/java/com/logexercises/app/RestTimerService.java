package com.logexercises.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;

public class RestTimerService extends Service {

    public static final String ACTION_START = "com.logexercises.app.REST_TIMER_START";
    public static final String ACTION_STOP = "com.logexercises.app.REST_TIMER_STOP";
    public static final String EXTRA_STARTED_AT = "startedAt";

    private static final String CHANNEL_ID = "rest_timer_v2";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        clearForegroundNotification();
        super.onDestroy();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            clearForegroundNotification();
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(intent.getAction())) {
            long startedAt = intent.getLongExtra(EXTRA_STARTED_AT, System.currentTimeMillis());
            Notification notification = buildNotification(startedAt);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
                );
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        }

        return START_STICKY;
    }

    private void clearForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
    }

    private Notification buildNotification(long startedAt) {
        createNotificationChannel();

        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags);

        RemoteViews compactView = buildTimerRemoteViews(R.layout.notification_rest_timer, startedAt);
        RemoteViews expandedView = buildTimerRemoteViews(R.layout.notification_rest_timer_expanded, startedAt);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_rest_timer)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setUsesChronometer(false)
            .setCustomContentView(compactView)
            .setCustomBigContentView(expandedView)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(contentIntent);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        }

        return builder.build();
    }

    private RemoteViews buildTimerRemoteViews(int layoutId, long startedAt) {
        RemoteViews views = new RemoteViews(getPackageName(), layoutId);
        long chronometerBase = SystemClock.elapsedRealtime() - (System.currentTimeMillis() - startedAt);
        views.setChronometer(R.id.rest_timer_chronometer, chronometerBase, null, true);
        views.setTextViewText(R.id.rest_timer_label, getString(R.string.rest_timer_notification_title));
        return views;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
        if (existing != null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            getString(R.string.rest_timer_channel_name),
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription(getString(R.string.rest_timer_channel_description));
        channel.setShowBadge(false);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }
}
