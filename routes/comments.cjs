const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment.cjs');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ message: "No token provided" });

    const token = authHeader.split(" ")[1];
    jwt.verify(token, "your_jwt_secret", (err, decoded) => {
        if (err) return res.status(403).json({ message: "Invalid token" });
        req.user = decoded;
        next();
    });
};

// Add a comment to a recipe
router.post('/:recipeId', verifyToken, async (req, res) => {
    try {
        const { content } = req.body;
        const comment = new Comment({
            content,
            recipe: req.params.recipeId,
            user: req.user.id
        });
        await comment.save();
        res.status(201).json(comment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all comments for a recipe
router.get('/:recipeId', async (req, res) => {
    try {
        const comments = await Comment.find({ recipe: req.params.recipeId })
            .populate('user', 'username')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete a comment
router.delete('/:commentId', verifyToken, async (req, res) => {
    try {
        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        if (comment.user.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }
        await comment.deleteOne();
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;