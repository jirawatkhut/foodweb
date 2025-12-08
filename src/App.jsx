import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import RecipeTable from "./pages/RecipeTable";
import UserTable from "./pages/UserTable";
import TagTable from "./pages/TagTable";
import ReportTable from "./pages/ReportTable";
import ProfilePage from "./pages/ProfilePage";
import MyRecipePage from "./pages/MyRecipePage";
import Report from "./pages/Report";
import ShowRecipeView from "./pages/ShowRecipeView";
import RecipeDetailPage from "./pages/RecipeDetailPage";
import FavoritePage from "./pages/FavoritePage";
import Recommend from "./pages/Recommend";
import UserRecipesPage from "./pages/UserRecipesPage";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  const HomeRouter = () => {
    const { token, role } = useContext(AuthContext);
    // If admin and logged in, go to admin dashboard first
    if (token && role === "1") return <Navigate to="/admin" replace />;
    return <Landing />;
  };
  return (
    <>
      <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/recipeTable" element={<RecipeTable />} />
        <Route path="/userTable" element={<UserTable />} />
        <Route path="/tagTable" element={<TagTable />} />
        <Route path="/reportTable" element={<ReportTable />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/myRecipes" element={<MyRecipePage />} />
        <Route path="/report" element={<Report />} />
        <Route path="/showRecipes" element={<ShowRecipeView />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/favorites" element={<FavoritePage />} />
        <Route path="/recommend" element={<Recommend />} />
        <Route path="/user/:userId/recipes" element={<UserRecipesPage />} />
      </Routes>
      </Layout>
    </>
  );
}

export default App;
