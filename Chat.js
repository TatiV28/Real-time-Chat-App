import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ImageIcon from '@mui/icons-material/Image';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  orderBy, 
  query,
  updateDoc,
  doc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

function Chat({ user, roomId }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUpload, setImageUpload] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [roomId]);

  const sendMessage = async () => {
    if (!newMessage.trim() && !imageUpload) return;

    let imageUrl = null;
    if (imageUpload) {
      const imageRef = ref(storage, `images/${Date.now()}_${imageUpload.name}`);
      const snapshot = await uploadBytes(imageRef, imageUpload);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    await addDoc(collection(db, 'rooms', roomId, 'messages'), {
      text: newMessage,
      imageUrl,
      userId: user.uid,
      userName: user.displayName,
      userAvatar: user.photoURL,
      timestamp: new Date(),
      reactions: {}
    });

    setNewMessage('');
    setImageUpload(null);
  };

  const addReaction = async (messageId, emoji) => {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await updateDoc(messageRef, {
      [`reactions.${user.uid}`]: emoji
    });
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ height: '80vh', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          <List>
            {messages.map((message) => (
              <ListItem key={message.id} alignItems="flex-start">
                <Avatar src={message.userAvatar} sx={{ mr: 2 }} />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2">{message.userName}</Typography>
                  <ListItemText primary={message.text} />
                  {message.imageUrl && (
                    <img 
                      src={message.imageUrl} 
                      alt="shared" 
                      style={{ maxWidth: '300px', borderRadius: '8px' }}
                    />
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {['😀', '❤️', '👍', '😂'].map((emoji) => (
                      <IconButton
                        key={emoji}
                        size="small"
                        onClick={() => addReaction(message.id, emoji)}
                      >
                        {emoji}
                      </IconButton>
                    ))}
                    {Object.entries(message.reactions || {}).map(([userId, emoji]) => (
                      <Typography key={userId} variant="caption">
                        {emoji}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
        <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <input
              type="file"
              id="image-upload"
              style={{ display: 'none' }}
              accept="image/*"
              onChange={(e) => setImageUpload(e.target.files[0])}
            />
            <label htmlFor="image-upload">
              <IconButton component="span">
                <ImageIcon />
              </IconButton>
            </label>
            <IconButton onClick={sendMessage} color="primary">
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default Chat;
