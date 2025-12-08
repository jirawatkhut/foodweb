import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import api from "../context/api.js";
import { formatThaiDateTime } from "../utils/formatDate";
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

    // dates formatted with formatThaiDateTime

    return (
        <div className="mt-6">
            <div className="space-y-6">
                {/* Submit block */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-xl font-semibold mb-3">ให้คะแนนและแสดงความคิดเห็น</h3>
                    {user ? (
                        <form onSubmit={handleSubmitComment} className="mb-0">
                            <textarea
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                className="w-full p-2 border rounded-lg mb-2"
                                placeholder="เขียนความคิดเห็นของคุณ..."
                                rows="3"
                                maxLength="150"
                            />
                            <div className="flex items-center justify-between">
                                <div className="text-sm text-gray-500">{newComment.length} / 150</div>
                                <button 
                                    type="submit"
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                                >
                                    ส่งความคิดเห็น
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p className="mb-0 text-gray-600">กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น</p>
                    )}
                </div>

                {/* All comments block */}
                <div className="bg-white rounded-lg shadow-md p-4">
                    <h3 className="text-xl font-semibold mb-3">ความคิดเห็นทั้งหมด ({comments.length})</h3>
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div key={comment._id} className="bg-gray-100 p-4 rounded-md">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="font-semibold text-gray-800">{comment.user.username}</p>
                                            <p className="text-gray-500 text-sm ml-2">{formatThaiDateTime(comment.createdAt)}</p>
                                        </div>
                                        <div className="mt-3 text-gray-700 whitespace-pre-wrap">{comment.content}</div>
                                    </div>
                                    {user && user._id === comment.user._id && (
                                        <div className="ml-4 self-start">
                                            <button
                                                onClick={() => handleDeleteComment(comment._id)}
                                                className="text-red-500 hover:text-red-700 text-sm"
                                            >
                                                ลบ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommentSection;