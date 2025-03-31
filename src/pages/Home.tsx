import React, { useState, useRef } from 'react';
import { 
  Button, 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Card,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Grow,
  Fade,
  Divider,
  Avatar,
  IconButton
} from '@mui/material';
import { 
  CameraAlt as CameraIcon, 
  PhotoLibrary as GalleryIcon, 
  Straighten as MeasureIcon,
  CheckCircleOutline as CheckIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Manejar la selección de archivo de la galería
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setIsLoading(true);
      const file = event.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (e) => {
        if (e.target && typeof e.target.result === 'string') {
          setImageUrl(e.target.result);
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Error al leer el archivo');
        setIsLoading(false);
        alert('No se pudo cargar la imagen. Intentá nuevamente.');
      };
      
      reader.readAsDataURL(file);
    }
  };

  // Abrir el selector de archivos
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Abrir la cámara (para dispositivos móviles)
  const openCamera = async () => {
    try {
      // En móviles, esto abrirá automáticamente la cámara
      if (fileInputRef.current) {
        // @ts-ignore - La propiedad capture no está en los tipos pero funciona en navegadores móviles
        fileInputRef.current.capture = 'environment';
        fileInputRef.current.click();
      }
    } catch (error) {
      console.error('Error al abrir la cámara:', error);
      alert('No se pudo acceder a la cámara. Intentá seleccionar una imagen de la galería.');
    }
  };

  // Procesar la imagen
  const processImage = () => {
    if (imageUrl) {
      navigate('/process', { state: { imageUrl } });
    } else {
      alert('Por favor, capturá o seleccioná una imagen primero.');
    }
  };

  return (
    <>
      <AppBar position="static" elevation={0} color="primary">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Medición de Áreas de Moldes
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="md">
        <Box sx={{ my: { xs: 2, sm: 4 } }}>
          <Fade in={true} timeout={800}>
            <Box textAlign="center" sx={{ mb: 4 }}>
              <Typography 
                variant={isMobile ? "h5" : "h4"} 
                component="h1" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #1e88e5 30%, #4caf50 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 2
                }}
              >
                Medición de Áreas de Moldes
              </Typography>
              <Typography 
                variant="subtitle1" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: '600px', 
                  mx: 'auto',
                  fontSize: '1.1rem',
                  lineHeight: 1.5
                }}
              >
                Capturá o seleccioná una imagen para comenzar a medir tus moldes
              </Typography>
            </Box>
          </Fade>

          <Grow in={true} timeout={1000}>
            <Card 
              sx={{ 
                mb: 4, 
                borderRadius: 3, 
                overflow: 'hidden', 
                boxShadow: 3,
                transform: 'translateY(0)',
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6,
                }
              }}
            >
              {imageUrl ? (
                <CardMedia
                  component="img"
                  height={isMobile ? 250 : 400}
                  image={imageUrl}
                  alt="Imagen seleccionada"
                  sx={{ 
                    objectFit: 'cover',
                    transition: 'transform 0.5s ease',
                    '&:hover': {
                      transform: 'scale(1.02)',
                    }
                  }}
                />
              ) : (
                <Box 
                  sx={{ 
                    height: isMobile ? 250 : 350, 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center',
                    backgroundColor: 'grey.50',
                    p: 4,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                  onClick={openFileSelector}
                >
                  <Box 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      backgroundColor: 'primary.light',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 2
                    }}
                  >
                    <AddIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                  </Box>
                  <Typography variant="h6" color="text.primary" sx={{ mb: 1 }}>
                    No hay imagen seleccionada
                  </Typography>
                  <Typography color="text.secondary" textAlign="center">
                    Hacé clic para seleccionar o arrastrá y soltá una imagen aquí
                  </Typography>
                </Box>
              )}
            </Card>
          </Grow>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          
          <Fade in={true} timeout={1200}>
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<CameraIcon />}
                  onClick={openCamera}
                  disabled={isLoading}
                  sx={{ 
                    py: 1.5,
                    backgroundColor: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    }
                  }}
                >
                  Tomar Foto
                </Button>
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<GalleryIcon />}
                  onClick={openFileSelector}
                  disabled={isLoading}
                  sx={{ py: 1.5 }}
                >
                  Galería
                </Button>
              </Grid>
            </Grid>
          </Fade>

          {imageUrl && (
            <Fade in={true} timeout={500}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                startIcon={<MeasureIcon />}
                onClick={processImage}
                disabled={isLoading}
                sx={{ 
                  mb: 4, 
                  py: 1.8,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                Medir Áreas
              </Button>
            </Fade>
          )}

          <Fade in={true} timeout={1400}>
            <Paper 
              elevation={2} 
              sx={{ 
                p: 3, 
                borderRadius: 3,
                borderLeft: '4px solid',
                borderColor: 'primary.main',
              }}
            >
              <Typography 
                variant="h6" 
                gutterBottom 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  color: 'primary.main',
                  gap: 1,
                  mb: 2
                }}
              >
                <Avatar 
                  sx={{ 
                    bgcolor: 'primary.light', 
                    width: 32, 
                    height: 32,
                    color: 'primary.main'
                  }}
                >
                  <Typography variant="subtitle2">i</Typography>
                </Avatar>
                Instrucciones:
              </Typography>
              
              <Divider sx={{ mb: 2 }} />
              
              <List dense sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <ListItem 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemIcon>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'success.light', 
                        color: 'success.main',
                        '&:hover': {
                          bgcolor: 'success.light',
                        }
                      }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Colocá una regla o referencia de medida junto a los moldes" 
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemIcon>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'success.light', 
                        color: 'success.main',
                        '&:hover': {
                          bgcolor: 'success.light',
                        }
                      }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tomá una foto clara con buen contraste" 
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemIcon>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'success.light', 
                        color: 'success.main',
                        '&:hover': {
                          bgcolor: 'success.light',
                        }
                      }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Asegurate que los bordes de los moldes estén bien definidos" 
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
                <ListItem 
                  sx={{ 
                    bgcolor: 'background.paper', 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ListItemIcon>
                    <IconButton 
                      size="small" 
                      sx={{ 
                        bgcolor: 'success.light', 
                        color: 'success.main',
                        '&:hover': {
                          bgcolor: 'success.light',
                        }
                      }}
                    >
                      <CheckIcon fontSize="small" />
                    </IconButton>
                  </ListItemIcon>
                  <ListItemText 
                    primary="Presioná 'Medir Áreas' para procesar la imagen" 
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              </List>
            </Paper>
          </Fade>
        </Box>
      </Container>
    </>
  );
} 