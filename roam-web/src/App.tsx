import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { CreatePostPage } from './pages/CreatePostPage'
import { DestinationDetailPage } from './pages/DestinationDetailPage'
import { ExplorePage } from './pages/ExplorePage'
import { HomeFeed } from './pages/HomeFeed'
import { PostDetailPage } from './pages/PostDetailPage'
import { ProfilePage } from './pages/ProfilePage'
import { SavedPage } from './pages/SavedPage'
import { SearchPage } from './pages/SearchPage'
import { VlogsPage } from './pages/VlogsPage'
import { VlogDetailPage } from './pages/VlogDetailPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AuthPage } from './pages/AuthPage'
import { AccountPage } from './pages/AccountPage'
import { PublicJourneyDetailPage } from './pages/PublicJourneyDetailPage'

export default function App() { return <AppShell><Routes>
  <Route path="/" element={<HomeFeed />} />
  <Route path="/explore" element={<ExplorePage />} />
  <Route path="/journeys/:journeyId" element={<PublicJourneyDetailPage />} />
  <Route path="/vlogs" element={<VlogsPage />} />
  <Route path="/vlogs/:vlogId" element={<VlogDetailPage />} />
  <Route path="/create" element={<CreatePostPage />} />
  <Route path="/profile/:username" element={<ProfilePage />} />
  <Route path="/posts/:postId" element={<PostDetailPage />} />
  <Route path="/destinations/:destinationId" element={<DestinationDetailPage />} />
  <Route path="/saved" element={<SavedPage />} />
  <Route path="/search" element={<SearchPage />} />
  <Route path="/login" element={<AuthPage mode="login" />} />
  <Route path="/signup" element={<AuthPage mode="signup" />} />
  <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
  <Route path="/setup-profile" element={<AuthPage mode="setup" />} />
  <Route path="/me" element={<AccountPage />} />
  <Route path="*" element={<NotFoundPage />} />
</Routes></AppShell> }
