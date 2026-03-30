package org.mochi.projects.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import org.mochi.projects.ui.design.DesignScreen
import org.mochi.projects.ui.find.FindProjectsScreen
import org.mochi.projects.ui.`object`.DiffViewerScreen
import org.mochi.projects.ui.project.ProjectScreen
import org.mochi.projects.ui.projectlist.ProjectListScreen
import org.mochi.projects.ui.settings.ProjectSettingsScreen

object Routes {
    const val PROJECT_LIST = "projectList"
    const val PROJECT = "project/{projectId}"
    const val PROJECT_OBJECT = "project/{projectId}/object/{objectId}"
    const val FIND_PROJECTS = "findProjects"
    const val PROJECT_SETTINGS = "project/{projectId}/settings"
    const val PROJECT_DESIGN = "project/{projectId}/design"
    const val DIFF_VIEWER = "project/{projectId}/diff/{repo}?source={source}&target={target}"

    fun project(projectId: String) = "project/$projectId"
    fun projectObject(projectId: String, objectId: String) = "project/$projectId/object/$objectId"
    fun projectSettings(projectId: String) = "project/$projectId/settings"
    fun projectDesign(projectId: String) = "project/$projectId/design"
    fun diffViewer(projectId: String, repo: String, source: String, target: String) =
        "project/$projectId/diff/$repo?source=$source&target=$target"
}

@Composable
fun ProjectsNavigation(onLogout: () -> Unit) {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = Routes.PROJECT_LIST) {
        composable(Routes.PROJECT_LIST) {
            ProjectListScreen(
                onProjectClick = { projectId ->
                    navController.navigate(Routes.project(projectId))
                },
                onFindProjects = {
                    navController.navigate(Routes.FIND_PROJECTS)
                },
                onLogout = onLogout
            )
        }

        composable(
            route = Routes.PROJECT,
            arguments = listOf(navArgument("projectId") { type = NavType.StringType })
        ) {
            ProjectScreen(
                onBack = { navController.popBackStack() },
                onSettings = { projectId ->
                    navController.navigate(Routes.projectSettings(projectId))
                },
                onDesign = { projectId ->
                    navController.navigate(Routes.projectDesign(projectId))
                },
                onViewDiff = { projectId, repo, source, target ->
                    navController.navigate(Routes.diffViewer(projectId, repo, source, target))
                }
            )
        }

        composable(
            route = Routes.PROJECT_OBJECT,
            arguments = listOf(
                navArgument("projectId") { type = NavType.StringType },
                navArgument("objectId") { type = NavType.StringType }
            )
        ) {
            ProjectScreen(
                onBack = { navController.popBackStack() },
                onSettings = { projectId ->
                    navController.navigate(Routes.projectSettings(projectId))
                },
                onDesign = { projectId ->
                    navController.navigate(Routes.projectDesign(projectId))
                },
                onViewDiff = { projectId, repo, source, target ->
                    navController.navigate(Routes.diffViewer(projectId, repo, source, target))
                },
                initialObjectId = it.arguments?.getString("objectId")
            )
        }

        composable(Routes.FIND_PROJECTS) {
            FindProjectsScreen(
                onBack = { navController.popBackStack() },
                onProjectSubscribed = {
                    navController.popBackStack()
                }
            )
        }

        composable(
            route = Routes.PROJECT_SETTINGS,
            arguments = listOf(navArgument("projectId") { type = NavType.StringType })
        ) {
            ProjectSettingsScreen(
                onBack = { navController.popBackStack() },
                onProjectDeleted = {
                    navController.popBackStack(Routes.PROJECT_LIST, inclusive = false)
                }
            )
        }

        composable(
            route = Routes.PROJECT_DESIGN,
            arguments = listOf(navArgument("projectId") { type = NavType.StringType })
        ) {
            DesignScreen(
                onBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.DIFF_VIEWER,
            arguments = listOf(
                navArgument("projectId") { type = NavType.StringType },
                navArgument("repo") { type = NavType.StringType },
                navArgument("source") { type = NavType.StringType; defaultValue = "" },
                navArgument("target") { type = NavType.StringType; defaultValue = "" }
            )
        ) {
            DiffViewerScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
