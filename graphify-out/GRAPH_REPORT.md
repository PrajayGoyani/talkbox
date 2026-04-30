# Graph Report - user-chat  (2026-04-30)

## Corpus Check
- 173 files · ~90,518 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 617 nodes · 568 edges · 36 communities detected
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]

## God Nodes (most connected - your core abstractions)
1. `ChatStore` - 41 edges
2. `RedisService` - 32 edges
3. `ChatService` - 22 edges
4. `AuthStore` - 19 edges
5. `RedisPresenceService` - 16 edges
6. `SocketService` - 14 edges
7. `AuthService` - 13 edges
8. `RedisSessionService` - 13 edges
9. `UIStore` - 12 edges
10. `TooltipStore` - 12 edges

## Surprising Connections (you probably didn't know these)
- `bootstrap()` --calls--> `setupGracefulShutdown()`  [INFERRED]
  backend/server.ts → backend/src/bootstrap/handler.ts
- `startServer()` --calls--> `initializeStatic()`  [INFERRED]
  backend/src/app.ts → backend/src/bootstrap/handler.ts
- `startServer()` --calls--> `initializeMiddlewares()`  [INFERRED]
  backend/src/app.ts → backend/src/bootstrap/handler.ts
- `startServer()` --calls--> `registerRoutes()`  [INFERRED]
  backend/src/app.ts → backend/src/routes/routes.ts
- `startServer()` --calls--> `initializeErrorHandlers()`  [INFERRED]
  backend/src/app.ts → backend/src/bootstrap/handler.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (2): ChatStore, playNotificationSound()

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (22): bootstrap(), initializeErrorHandlers(), initializeExtensions(), initializeMiddlewares(), initializeStatic(), setupGracefulShutdown(), shutdown(), getAgenda() (+14 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (1): RedisService

### Community 3 - "Community 3"
Cohesion: 0.13
Nodes (7): authenticateToken(), AuthService, generateAccessToken(), generateRefreshToken(), generateTokens(), verifyAccessToken(), verifyRefreshToken()

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (1): ChatService

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (8): MessageHandler, ReactionHandler, getModifyCutoff(), getScrubCutoff(), isPastModifyLimit(), isScrubbed(), extractEmojiMetadata(), getCanonicalSlug()

### Community 6 - "Community 6"
Cohesion: 0.15
Nodes (1): AuthStore

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (1): RedisPresenceService

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (5): SocketManager, getDisallowedEmojis(), getEmojiName(), parseMessageContent(), splitByRegex()

### Community 9 - "Community 9"
Cohesion: 0.15
Nodes (1): SocketService

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (1): TooltipStore

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (1): RedisSessionService

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (1): UIStore

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (1): AppError

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (1): NotificationService

### Community 16 - "Community 16"
Cohesion: 0.2
Nodes (1): ActiveChatStore

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (1): RedisGuardService

### Community 19 - "Community 19"
Cohesion: 0.36
Nodes (4): calculateHorizontalOffset(), calculateVerticalPosition(), portal(), updatePosition()

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (1): ChatLockdownService

### Community 21 - "Community 21"
Cohesion: 0.38
Nodes (1): UserCacheService

### Community 23 - "Community 23"
Cohesion: 0.53
Nodes (4): formatListTime(), formatSimpleTime(), getDateLabel(), getFormatter()

### Community 24 - "Community 24"
Cohesion: 0.6
Nodes (1): ThemeStore

### Community 25 - "Community 25"
Cohesion: 0.47
Nodes (1): SettingsStore

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (1): NotificationStore

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (1): UserService

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (1): PresenceService

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (1): EmailService

### Community 30 - "Community 30"
Cohesion: 0.4
Nodes (1): ImageService

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (1): RedisBaseService

### Community 33 - "Community 33"
Cohesion: 0.5
Nodes (2): getBaseUrl(), isLocalhost()

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (1): ApiError

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (1): ConfirmStore

### Community 36 - "Community 36"
Cohesion: 0.6
Nodes (1): RouterStore

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (1): TypingHandler

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (1): isValidUsername()

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (2): processDowngradeBatch(), subscriptionHandler()

## Knowledge Gaps
- **Thin community `Community 0`** (44 nodes): `chat.svelte.ts`, `audio.ts`, `ChatStore`, `.acceptChat()`, `.activeChatId()`, `.connect()`, `.constructor()`, `.deleteMessage()`, `.disconnect()`, `.editMessage()`, `.emitTyping()`, `.fetchChats()`, `.fetchRequests()`, `.handleChatAccepted()`, `.handleMessageAlert()`, `.handleMessageDeleted()`, `.handleMessageSentAck()`, `.handleMessageUpdated()`, `.handleNotification()`, `.handleProfileUpdate()`, `.handleReactionUpdate()`, `.handleReceiveMessage()`, `.hasMoreMessages()`, `.isLoadingMessages()`, `.isSendingMessage()`, `.loadMessages()`, `.loadMoreChats()`, `.loadMoreRequests()`, `.loadOlderMessages()`, `.loadPinnedChats()`, `.markChatRead()`, `.messages()`, `.onRefreshChats()`, `.onToast()`, `.patchChatLocally()`, `.reactToMessage()`, `.rejectChat()`, `.savePinnedChats()`, `.sendChatRequest()`, `.sendMessage()`, `.socket()`, `.sortChats()`, `.toggleChatPin()`, `playNotificationSound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 2`** (33 nodes): `redis.service.ts`, `RedisService`, `.checkAndSetIdempotency()`, `.client()`, `.close()`, `.constructor()`, `.decrementGlobalSession()`, `.deleteToken()`, `.getCachedPartners()`, `.getGlobalSessionCount()`, `.getLastSeenBatched()`, `.getOnlineUsers()`, `.getSyncQueueCount()`, `.getToken()`, `.incrementAndCheckLimit()`, `.incrementGlobalSession()`, `.invalidatePartnerCache()`, `.isChatLocked()`, `.isConnected()`, `.isUserOnline()`, `.lockChat()`, `.popSyncQueue()`, `.publishCacheInvalidation()`, `.publishSessionTakeover()`, `.queuePresenceSync()`, `.queuePresenceSyncBatched()`, `.setCachedPartners()`, `.setUserOffline()`, `.setUserOnline()`, `.storeToken()`, `.subClient()`, `.takeoverFreeSession()`, `.unlockChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 4`** (22 nodes): `chat.service.ts`, `chat.service.ts`, `ChatService`, `.acceptChat()`, `._assertParticipant()`, `.constructor()`, `._decodeCursor()`, `.deleteChat()`, `._encodeCursor()`, `.fetchChats()`, `.fetchRequests()`, `.getChatListing()`, `.getChatRequests()`, `.loadMessages()`, `.loadOlderMessages()`, `.markChatRead()`, `.rejectChat()`, `.requestChat()`, `.searchChats()`, `.sendChatRequest()`, `.setIO()`, `._transformChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (20 nodes): `auth.svelte.ts`, `AuthStore`, `.clearAuth()`, `.clearBootTimer()`, `.constructor()`, `.fetchMe()`, `.forgotPassword()`, `.init()`, `.login()`, `.logout()`, `.resendVerification()`, `.resetPassword()`, `.scheduleRefresh()`, `.setAuth()`, `.signup()`, `.silentRefresh()`, `.updateAvatar()`, `.updateProfile()`, `.upgradeToPro()`, `.verifyEmail()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 7`** (17 nodes): `presence.ts`, `RedisPresenceService`, `.client()`, `.constructor()`, `.getCachedPartners()`, `.getLastSeenBatched()`, `.getOnlineUsers()`, `.getSyncQueueCount()`, `.invalidatePartnerCache()`, `.isConnected()`, `.isUserOnline()`, `.popSyncQueue()`, `.queuePresenceSync()`, `.queuePresenceSyncBatched()`, `.setCachedPartners()`, `.setUserOffline()`, `.setUserOnline()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (15 nodes): `socket.service.ts`, `SocketService`, `.constructor()`, `._getPartnerIds()`, `.handleConnection()`, `.handleDeleteMessage()`, `.handleEditMessage()`, `._handleGlobalCacheInvalidation()`, `._handleGlobalTakeover()`, `.handleReaction()`, `.handleTyping()`, `.init()`, `.invalidatePartnerCache()`, `.notifyProfileUpdate()`, `.saveAndDeliverMessage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 10`** (14 nodes): `tooltip.svelte.ts`, `tooltip()`, `TooltipStore`, `.constructor()`, `.hide()`, `.position()`, `.screenWidth()`, `.show()`, `.showTemporary()`, `.text()`, `.variant()`, `.visible()`, `.x()`, `.y()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 11`** (14 nodes): `session.ts`, `RedisSessionService`, `.client()`, `.constructor()`, `.decrementGlobalSession()`, `.deleteToken()`, `.getGlobalSessionCount()`, `.getToken()`, `.incrementGlobalSession()`, `.isConnected()`, `.publishCacheInvalidation()`, `.publishSessionTakeover()`, `.storeToken()`, `.takeoverFreeSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 12`** (13 nodes): `ui.svelte.ts`, `UIStore`, `.addAlert()`, `.closeChatInfo()`, `.closeNotifications()`, `.constructor()`, `.expandSidebar()`, `.navigate()`, `.removeAlert()`, `.setSidebarCollapsed()`, `.toggleChatInfo()`, `.toggleNotifications()`, `.toggleSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 13`** (11 nodes): `AppError.ts`, `AppError`, `.badRequest()`, `.conflict()`, `.constructor()`, `.forbidden()`, `.limitReached()`, `.notAcceptable()`, `.notFound()`, `.tooMany()`, `.unauthorized()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (10 nodes): `notification.service.ts`, `notification.service.ts`, `NotificationService`, `.create()`, `.getByUser()`, `.markAllAsRead()`, `.markAsRead()`, `.notify()`, `.requestPermission()`, `.showBrowserNotification()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (10 nodes): `active-chat.svelte.ts`, `ActiveChatStore`, `.clear()`, `.handleMessageDeleted()`, `.handleMessageSentAck()`, `.handleMessageUpdated()`, `.handleReactionUpdate()`, `.handleReceiveMessage()`, `.initialize()`, `.loadOlderMessages()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (10 nodes): `guard.ts`, `RedisGuardService`, `.checkAndSetIdempotency()`, `.client()`, `.constructor()`, `.incrementAndCheckLimit()`, `.isChatLocked()`, `.isConnected()`, `.lockChat()`, `.unlockChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (8 nodes): `chat-lockdown.service.ts`, `ChatLockdownService`, `.constructor()`, `.hydrate()`, `.init()`, `.isChatDeleted()`, `.lockdownChat()`, `.unlockChat()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (7 nodes): `user-cache.service.ts`, `UserCacheService`, `.constructor()`, `.getUser()`, `.initRedisSubscription()`, `.invalidate()`, `.set()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (6 nodes): `theme.svelte.ts`, `ThemeStore`, `.applyTheme()`, `.constructor()`, `.setTheme()`, `.toggleTheme()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (6 nodes): `settings.svelte.ts`, `SettingsStore`, `.constructor()`, `.loadSettings()`, `.saveSettings()`, `.toggleSound()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (6 nodes): `notification.svelte.ts`, `NotificationStore`, `.addRealTimeNotification()`, `.fetchNotifications()`, `.markAllAsRead()`, `.markAsRead()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (6 nodes): `user.service.ts`, `UserService`, `.constructor()`, `.searchByUsername()`, `.updateProfile()`, `.uploadAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (6 nodes): `presence.service.ts`, `PresenceService`, `.constructor()`, `.emitPartnersStatus()`, `.handleGlobalStatusUpdate()`, `.notifyStatusChange()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (6 nodes): `email.service.ts`, `EmailService`, `.constructor()`, `.isConfigured()`, `.sendResetEmail()`, `.sendVerificationEmail()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (6 nodes): `image.service.ts`, `ImageService`, `.constructor()`, `.deleteOldAvatar()`, `.getProcessedBuffer()`, `.processAndSaveAvatar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (6 nodes): `base.ts`, `RedisBaseService`, `.close()`, `.constructor()`, `.isConnected()`, `._logFailOpen()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (5 nodes): `config.ts`, `getBaseUrl()`, `getBoolEnv()`, `getEnv()`, `isLocalhost()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (5 nodes): `errors.ts`, `ApiError`, `.constructor()`, `.fromResponse()`, `.handleRateLimit()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (5 nodes): `confirm.svelte.ts`, `ConfirmStore`, `.cancel()`, `.confirm()`, `.show()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (5 nodes): `router.svelte.ts`, `RouterStore`, `.init()`, `.navigate()`, `.updateFromHash()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `typing.handler.ts`, `TypingHandler`, `.constructor()`, `.handleTyping()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (3 nodes): `validation.ts`, `validation.ts`, `isValidUsername()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (3 nodes): `subscription.handler.ts`, `processDowngradeBatch()`, `subscriptionHandler()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getAgenda()` connect `Community 1` to `Community 3`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._