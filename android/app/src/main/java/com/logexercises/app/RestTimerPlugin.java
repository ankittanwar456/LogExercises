package com.logexercises.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "RestTimer",
    permissions = {
        @Permission(
            alias = RestTimerPlugin.NOTIFICATIONS,
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class RestTimerPlugin extends Plugin {

    static final String NOTIFICATIONS = "notifications";

    @PluginMethod
    public void start(PluginCall call) {
        Long startedAt = readStartedAt(call);
        if (startedAt == null) {
            call.reject("startedAt is required");
            return;
        }

        if (needsNotificationPermission() && getPermissionState(NOTIFICATIONS) != PermissionState.GRANTED) {
            requestPermissionForAlias(NOTIFICATIONS, call, "startWithPermission");
            return;
        }

        launchService(startedAt);
        call.resolve();
    }

    @PermissionCallback
    private void startWithPermission(PluginCall call) {
        if (getPermissionState(NOTIFICATIONS) != PermissionState.GRANTED) {
            call.reject("Notification permission denied");
            return;
        }

        Long startedAt = readStartedAt(call);
        if (startedAt == null) {
            call.reject("startedAt is required");
            return;
        }

        launchService(startedAt);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), RestTimerService.class);
        getContext().stopService(intent);
        call.resolve();
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put(NOTIFICATIONS, permissionStateToString(getPermissionState(NOTIFICATIONS)));
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (!needsNotificationPermission()) {
            JSObject result = new JSObject();
            result.put(NOTIFICATIONS, "granted");
            call.resolve(result);
            return;
        }

        if (getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put(NOTIFICATIONS, "granted");
            call.resolve(result);
            return;
        }

        requestPermissionForAlias(NOTIFICATIONS, call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put(NOTIFICATIONS, permissionStateToString(getPermissionState(NOTIFICATIONS)));
        call.resolve(result);
    }

    private Long readStartedAt(PluginCall call) {
        Long startedAt = call.getLong("startedAt");
        if (startedAt != null) {
            return startedAt;
        }

        Double startedAtDouble = call.getDouble("startedAt");
        if (startedAtDouble != null) {
            return startedAtDouble.longValue();
        }

        Integer startedAtInt = call.getInt("startedAt");
        if (startedAtInt != null) {
            return startedAtInt.longValue();
        }

        return null;
    }

    private void launchService(long startedAt) {
        Intent intent = new Intent(getContext(), RestTimerService.class);
        intent.setAction(RestTimerService.ACTION_START);
        intent.putExtra(RestTimerService.EXTRA_STARTED_AT, startedAt);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
    }

    private boolean needsNotificationPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED;
    }

    private String permissionStateToString(PermissionState state) {
        if (state == PermissionState.GRANTED) {
            return "granted";
        }
        if (state == PermissionState.DENIED) {
            return "denied";
        }
        return "prompt";
    }
}
