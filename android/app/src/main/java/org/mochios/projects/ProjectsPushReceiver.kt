package org.mochios.projects

import android.content.Context
import android.net.Uri
import org.mochios.android.push.MochiPushReceiver

class ProjectsPushReceiver : MochiPushReceiver() {

    override fun channelId(context: Context, instance: String): String =
        ProjectsApplication.NOTIFICATION_CHANNEL_ID

    override fun deepLinkFor(context: Context, instance: String, link: String): Uri =
        Uri.parse("mochi-projects://notification")
            .buildUpon()
            .appendQueryParameter("link", link)
            .build()

    override fun appName(): String = "projects"
}
