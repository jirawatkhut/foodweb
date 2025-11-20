import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import api from "../context/api.js";
const CommentSection = ({ recipeId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const { user } = useContext(AuthContext);

    // Fetch comments
    const fetchComments = async () => {
        try {
            const response = await api.get(`/api/comments/${recipeId}`);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [recipeId]);

    // Add new comment
    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            await api.post(
                `/api/comments/${recipeId}`,
                { content: newComment },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            setNewComment('');
            fetchComments(); // Refresh comments
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    };

    // Delete comment
    const handleDeleteComment = async (commentId) => {
        try {
            await axios.delete(
                `/api/comments/${commentId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            fetchComments(); // Refresh comments
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="mt-6">
            <h3 className="text-xl font-semibold mb-4">ความคิดเห็น</h3>
            
            {user ? (
                <form onSubmit={handleSubmitComment} className="mb-6">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full p-2 border rounded-lg mb-2"
                        placeholder="เขียนความคิดเห็นของคุณ..."
                        rows="3"
                        maxLength="150"
                    />
                    <div className="text-right text-sm text-gray-500">
                        {newComment.length} / 150
                    </div>
                    <button 
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                    >
                        ส่งความคิดเห็น
                    </button>
                </form>
            ) : (
                <p className="mb-4 text-gray-600">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
            )}

            <div className="space-y-4">
                {comments.map((comment) => (
                    <div key={comment._id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold">{comment.user.username}</p>
                                <p className="text-gray-600 text-sm">
                                    {formatDate(comment.createdAt)}
                                </p>
                                <p className="mt-2">{comment.content}</p>
                            </div>
                            {user && user._id === comment.user._id && (
                                <button
                                    onClick={() => handleDeleteComment(comment._id)}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    ลบ
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommentSection;