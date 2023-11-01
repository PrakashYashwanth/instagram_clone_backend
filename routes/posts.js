/* eslint-disable no-underscore-dangle */
/* eslint-disable consistent-return */
const express = require('express')
const Post = require('../models/postModel') // Import the Post model
const User = require('../models/userModel') // Import the User model
const verifyToken = require('../utils/tokenValidation')

const router = express.Router()

// Create a new post
router.post('/create', verifyToken, (req, res) => {
  const { caption, imageUrl, userId } = req.body
  if (!caption || !imageUrl || !userId) {
    return res
      .status(400)
      .json({ error: 'Caption, imageUrl, and userId are required' })
  }

  // Find the user by ID to associate with the post
  User.findById(userId)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Create a new post and link it to the user
      const newPost = new Post({ caption, imageUrl, user })
      // After creating a new post, update the user's posts array
      user.posts.push(newPost._id)
      user.save()
      newPost
        .save()
        .then((post) => {
          res.status(201).json(post)
        })
        .catch((error) => {
          res.status(500).json({ error, message: 'Failed to create a post' })
        })
    })
    .catch((error) => {
      res.status(500).json({ error, message: 'Failed to create a post' })
    })
})

// View a post
router.get('/post/:postId', (req, res) => {
  const { postId } = req.params

  // Find the post by ID in MongoDB
  Post.findById(postId)
    .populate('user', 'username') // Populate the user field with only the username
    .exec()
    .then((post) => {
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      res.json(post)
    })
    .catch((error) => {
      res.status(500).json({ error, message: 'Failed to fetch the post' })
    })
})

// Add a comment to a post
router.post('/post/:postId/comment', verifyToken, (req, res) => {
  const { postId } = req.params
  const { text, userId } = req.body // You'll need to provide the user's ID

  if (!text || !userId) {
    return res
      .status(400)
      .json({ error: 'Comment text and userId are required' })
  }

  // Find the post by ID and add a new comment
  Post.findByIdAndUpdate(
    postId,
    { $push: { comments: { text, user: userId } } },
    { new: true }
  )
    .then((post) => {
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      res.status(201).json(post)
    })
    .catch((error) => {
      res.status(500).json({ error, message: 'Failed to add a comment' })
    })
})

// Like or unlike a post
router.post('/post/:postId/like', verifyToken, (req, res) => {
  const { postId } = req.params

  // Check if the request includes a parameter 'action' to determine like or unlike
  const { action } = req.body

  // Find the post by ID and update the likes count accordingly
  const update =
    action === 'like' ? { $inc: { likes: 1 } } : { $inc: { likes: -1 } }

  Post.findByIdAndUpdate(postId, update, { new: true })
    .then((post) => {
      if (!post) {
        return res.status(404).json({ error: 'Post not found' })
      }
      res.json(post)
    })
    .catch((error) => {
      res.status(500).json({ error, message: 'Failed to like/unlike the post' })
    })
})

module.exports = router
