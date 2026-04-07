export type Language = 'en' | 'zh'

export type TranslationKey =
  // 导航
  | 'nav.project' | 'nav.docs' | 'nav.settings'
  // 看板
  | 'board.title' | 'board.subtitle' | 'board.newTask'
  | 'board.stats.touchedThisWeek' | 'board.stats.agentWorking'
  | 'board.stats.openTasks' | 'board.stats.waitingReview'
  // 泳道
  | 'lane.backlog' | 'lane.triaged' | 'lane.in_progress' | 'lane.testing'
  | 'lane.backlog.hint' | 'lane.triaged.hint' | 'lane.in_progress.hint' | 'lane.testing.hint'
  | 'lane.backlog.empty' | 'lane.triaged.empty' | 'lane.in_progress.empty' | 'lane.testing.empty'
  // 任务状态
  | 'task.state.idea' | 'task.state.ready' | 'task.state.working' | 'task.state.review'
  | 'task.state.waitingAnswer' | 'task.state.finished' | 'task.state.needsFix'
  | 'task.state.needsHelp' | 'task.state.checkingNow' | 'task.state.notChecked'
  | 'task.state.failedChecks' | 'task.state.blockedIncomplete'
  // 创建任务向导
  | 'create.title' | 'create.step1.title' | 'create.step1.placeholder'
  | 'create.step2.title' | 'create.step3.title' | 'create.step4.title'
  | 'create.kind.design' | 'create.kind.bugfix' | 'create.kind.feature' | 'create.kind.docs'
  | 'create.kind.design.desc' | 'create.kind.bugfix.desc' | 'create.kind.feature.desc' | 'create.kind.docs.desc'
  | 'create.qa.auto' | 'create.qa.browser' | 'create.qa.skip'
  | 'create.qa.auto.desc' | 'create.qa.browser.desc' | 'create.qa.skip.desc'
  | 'create.url.infer' | 'create.url.home' | 'create.url.specific' | 'create.url.none'
  | 'create.url.infer.desc' | 'create.url.home.desc' | 'create.url.specific.desc' | 'create.url.none.desc'
  | 'create.preview.title' | 'create.preview.objective' | 'create.preview.criteria'
  | 'create.submit' | 'create.next' | 'create.back'
  // 计划步骤状态
  | 'plan.pending' | 'plan.running' | 'plan.done' | 'plan.failed' | 'plan.aborted'
  // 活动
  | 'activity.title' | 'activity.empty' | 'activity.agentStatus.idle'
  | 'activity.agentStatus.thinking' | 'activity.agentStatus.doing'
  // 文档
  | 'docs.title' | 'docs.subtitle' | 'docs.search' | 'docs.newProject'
  | 'docs.newDoc' | 'docs.project' | 'docs.tag' | 'docs.allProjects' | 'docs.allTags'
  | 'docs.authored' | 'docs.readonly'
  // 设置
  | 'settings.title' | 'settings.subtitle'
  | 'settings.notifications' | 'settings.webhook.title' | 'settings.webhook.desc'
  | 'settings.webhook.placeholder' | 'settings.webhook.connected' | 'settings.webhook.disconnected'
  | 'settings.system' | 'settings.configSource.title' | 'settings.configSource.desc'
  | 'settings.bridgeStatus.title' | 'settings.bridgeStatus.desc' | 'settings.bridgeStatus.active'
  | 'settings.appearance' | 'settings.theme.title' | 'settings.theme.desc'
  | 'settings.theme.dark' | 'settings.theme.light'
  | 'settings.language.title' | 'settings.language.desc'
  | 'settings.about' | 'settings.about.desc'
  // 新手引导
  | 'onboarding.title' | 'onboarding.subtitle'
  | 'onboarding.step1.title' | 'onboarding.step1.desc'
  | 'onboarding.step2.title' | 'onboarding.step2.desc'
  | 'onboarding.step3.title' | 'onboarding.step3.desc'
  | 'onboarding.step4.title' | 'onboarding.step4.desc'
  | 'onboarding.cta'
  // Tooltip
  | 'tooltip.sessionKey' | 'tooltip.countdown' | 'tooltip.harnessCapabilities'
  | 'tooltip.planPending' | 'tooltip.planRunning' | 'tooltip.planDone'
  | 'tooltip.planFailed' | 'tooltip.planAborted'
  // 通用
  | 'common.save' | 'common.cancel' | 'common.close' | 'common.delete'
  | 'common.loading' | 'common.done' | 'common.edit' | 'common.refresh'
  | 'common.stop' | 'common.create' | 'common.noResults' | 'common.untitled'

export type TranslationMap = Record<TranslationKey, string>
