import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Divider,
  Slider,
  Alert,
  AlertTitle,
  IconButton,
  Card,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  Tooltip,
  Fade,
  Grow,
  Chip,
  Badge,
  CardHeader,
  CardContent,
  Avatar,
  Backdrop,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Popover,
  Fab,
  StepContent,
  Zoom,
  Snackbar,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  ArrowBack,
  Straighten,
  Delete,
  SquareFoot,
  AutoFixHigh,
  TouchApp,
  Calculate,
  InfoOutlined,
  CallSplit as TypeIcon,
  Timeline as ContourIcon,
  BrandingWatermark as AreaIcon,
  Help,
  ColorLens,
  FormatPaint,
  Close,
  Check,
  Colorize,
  PaletteOutlined,
} from '@mui/icons-material';

// Declarar OpenCV para TypeScript
declare global {
  interface Window {
    cv: any;
  }
}

// Definir tipos de moldes
enum MoldType {
  CORTE = 'Corte',
  FORRO = 'Forro',
  OTRO = 'Otro',
}

// Interfaz para los objetos de molde
interface Mold {
  id: number;
  contour: number[][]; // Puntos del contorno
  type: MoldType;
  multiplier: number;
  area: number; // Area en píxeles
  areaInCm2: number; // Area en cm²
}

// Pasos del proceso
enum ProcessStep {
  CALIBRATION = 0,
  DETECTION = 1,
  RESULTS = 2,
}

// Modos de selección
enum SelectionMode {
  NONE = 'none',
  CALIBRATION = 'calibration',
  MANUAL_SELECTION = 'manual',
  EYEDROPPER = 'eyedropper',
}

export default function Process() {
  const location = useLocation();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeStep, setActiveStep] = useState<ProcessStep>(ProcessStep.CALIBRATION);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(SelectionMode.NONE);
  const [showTutorial, setShowTutorial] = useState<boolean>(true);
  const [tutorialStep, setTutorialStep] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');
  
  // Variables de estado para la calibración
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{x: number, y: number}[]>([]);
  const [calibrationFactor, setCalibrationFactor] = useState<number | null>(null);
  const [calibrationDistance, setCalibrationDistance] = useState<number>(10); // Default 10cm
  
  // Variables de estado para los moldes
  const [moldsDetected, setMoldsDetected] = useState<Mold[]>([]);
  const [selectedMold, setSelectedMold] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // Estado para configuración de detección
  const [detectionMode, setDetectionMode] = useState<'normal' | 'inverse' | 'adaptive' | 'white'>('white');
  const [thresholdValue, setThresholdValue] = useState<number>(200);
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [showingDebugMask, setShowingDebugMask] = useState<boolean>(false);
  const [hsvParams, setHsvParams] = useState({
    hMin: 0,
    sMin: 0,
    vMin: 200,
    hMax: 180,
    sMax: 50,
    vMax: 255
  });
  
  // Estado para errores
  const [error, setError] = useState<string | null>(null);
  
  // OpenCV.js disponible
  const [openCvLoaded, setOpenCvLoaded] = useState(false);
  
  // Modos de detección disponibles
  const detectionModes = [
    { value: 'normal', label: 'Normal (Umbral simple)', description: 'Detecta objetos basado en un umbral de brillo' },
    { value: 'inverse', label: 'Invertido (Objetos oscuros)', description: 'Mejor para detectar objetos oscuros sobre fondo claro' },
    { value: 'adaptive', label: 'Adaptativo (Auto)', description: 'Intenta detectar todo tipo de objetos automáticamente' },
    { value: 'white', label: 'Objeto Blanco (HSV)', description: 'Optimizado para detectar objetos blancos sobre cualquier fondo' }
  ];
  
  // Estados para el diálogo de clasificación rápida
  const [showClassificationDialog, setShowClassificationDialog] = useState<boolean>(false);
  const [tempMoldId, setTempMoldId] = useState<number | null>(null);
  const [tempMoldType, setTempMoldType] = useState<MoldType>(MoldType.CORTE);
  
  // Estado para cursor durante calibración
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);
  
  // Referencia para romper la dependencia circular de redrawImageWithCalibrationGuide
  const redrawImageWithCalibrationGuideRef = useRef<(() => void) | null>(null);
  
  // Añadir estado para la tolerancia del cuentagotas y el color seleccionado
  const [colorTolerance, setColorTolerance] = useState<number>(25);
  const [selectedColor, setSelectedColor] = useState<{h: number, s: number, v: number} | null>(null);
  
  // Redibujar imagen original (utilizada para cancelar la calibración)
  const redrawImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !imageRef.current) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
  };
  
  // Versión nativa del manejador de movimiento del mouse para addEventListener
  const handleNativeMouseMove = useCallback((e: MouseEvent) => {
    if (!isCalibrating || calibrationPoints.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    setCursorPosition({ x, y });
    
    // Redibujar la imagen con la línea guía usando la referencia
    if (redrawImageWithCalibrationGuideRef.current) {
      redrawImageWithCalibrationGuideRef.current();
    }
  }, [isCalibrating, calibrationPoints]);
  
  // Manejar la tecla Escape para cancelar la calibración
  const handleEscapeKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && selectionMode === SelectionMode.CALIBRATION) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.removeEventListener('mousemove', handleNativeMouseMove);
      }
      document.removeEventListener('keydown', handleEscapeKey);
      
      setCalibrationPoints([]);
      redrawImage();
      setSelectionMode(SelectionMode.NONE);
      setIsCalibrating(false);
      
      setSnackbarMessage('Calibración cancelada');
      setSnackbarOpen(true);
    }
  }, [selectionMode, handleNativeMouseMove]);
  
  // Redibujar imagen con guía de calibración
  const redrawImageWithCalibrationGuide = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redibujar imagen original directamente desde la referencia
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    
    // Dibujar puntos de calibración existentes
    calibrationPoints.forEach((point, index) => {
      // Dibujar círculo más visible
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(33, 150, 243, 0.5)'; // Azul semitransparente
      ctx.fill();
      
      // Borde del círculo
      ctx.strokeStyle = '#1976d2';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Etiqueta con número del punto
      ctx.font = 'bold 14px Roboto';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((index + 1).toString(), point.x, point.y);
    });
    
    // Dibujar línea guía si estamos en proceso de calibración y tenemos un punto inicial
    if (isCalibrating && calibrationPoints.length === 1 && cursorPosition) {
      const startPoint = calibrationPoints[0];
      
      // Dibujar línea punteada desde el primer punto hasta la posición del cursor
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(cursorPosition.x, cursorPosition.y);
      ctx.strokeStyle = '#FF9800'; // Color naranja para la línea guía
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]); // Línea punteada
      ctx.stroke();
      ctx.setLineDash([]); // Restaurar línea sólida para otros elementos
      
      // Calcular distancia aproximada en cm usando factor estimado
      let distanceText = 'Seleccioná el segundo punto';
      
      const pixelDistance = Math.sqrt(
        Math.pow(startPoint.x - cursorPosition.x, 2) + 
        Math.pow(startPoint.y - cursorPosition.y, 2)
      );
      
      // Usar estimación de calibrationDistance
      const cmDistance = (pixelDistance * calibrationDistance) / 100;
      distanceText = `≈ ${cmDistance.toFixed(1)} cm`;
      
      // Mostrar distancia estimada
      const midX = (startPoint.x + cursorPosition.x) / 2;
      const midY = (startPoint.y + cursorPosition.y) / 2 - 15;
      
      // Fondo para el texto
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const textWidth = ctx.measureText(distanceText).width;
      ctx.fillRect(midX - textWidth/2 - 5, midY - 10, textWidth + 10, 20);
      
      // Texto con la distancia
      ctx.font = '12px Roboto';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(distanceText, midX, midY);
    }
    
    // Si ya tenemos dos puntos de calibración, mostrar la distancia entre ellos
    if (calibrationPoints.length === 2) {
      const [p1, p2] = calibrationPoints;
      
      // Dibujar línea entre puntos
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = '#4CAF50'; // Verde para la línea final
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Texto con la distancia en cm
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2 - 15;
      
      const distanceText = `${calibrationDistance} cm`;
      
      // Fondo para el texto
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const textWidth = ctx.measureText(distanceText).width;
      ctx.fillRect(midX - textWidth/2 - 5, midY - 10, textWidth + 10, 20);
      
      // Texto con la distancia
      ctx.font = '12px Roboto';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText(distanceText, midX, midY);
    }
  }, [calibrationPoints, isCalibrating, cursorPosition, calibrationDistance, imageRef]);

  // Actualizar la referencia cuando cambia la función
  useEffect(() => {
    redrawImageWithCalibrationGuideRef.current = redrawImageWithCalibrationGuide;
  }, [redrawImageWithCalibrationGuide]);
  
  // Función para manejar el movimiento del mouse durante la calibración (para React events)
  const handleMouseMoveCalibration = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCalibrating || calibrationPoints.length === 0) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    setCursorPosition({ x, y });
    
    // Redibujar la imagen con la línea guía
    if (redrawImageWithCalibrationGuideRef.current) {
      redrawImageWithCalibrationGuideRef.current();
    }
  }, [isCalibrating, calibrationPoints]);
  
  // Manejar clics en el canvas para calibración o selección manual
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Convertir coordenadas con precisión
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Modo de calibración
    if (selectionMode === SelectionMode.CALIBRATION) {
      setCalibrationPoints(prev => {
        // Si ya tenemos 2 puntos, reiniciar
        if (prev.length >= 2) return [{x, y}];
        
        // Añadir el nuevo punto
        const newPoints = [...prev, {x, y}];
        
        // Si tenemos 2 puntos, calcular el factor de calibración
        if (newPoints.length === 2) {
          const [p1, p2] = newPoints;
          const pixelDistance = Math.sqrt(
            Math.pow(p1.x - p2.x, 2) + 
            Math.pow(p1.y - p2.y, 2)
          );
          
          // Factor: centímetros por píxel (cm/px)
          const factor = calibrationDistance / pixelDistance;
          setCalibrationFactor(factor);
          setIsCalibrating(false);
          
          // Actualizar el estado actual del proceso
          setActiveStep(ProcessStep.DETECTION);
          
          // Mostrar mensaje de éxito
          setSnackbarOpen(true);
          setSnackbarMessage(`Calibración exitosa. Factor: ${factor.toFixed(6)} cm/px`);
          setSnackbarSeverity('success');
        }
        
        return newPoints;
      });
      
      // Redibujar la imagen con los puntos de calibración
      setTimeout(() => {
        redrawImageWithCalibrationGuide();
      }, 50);
    } else if (selectionMode === SelectionMode.MANUAL_SELECTION) {
      // Código de selección manual existente
    } else if (selectionMode === SelectionMode.EYEDROPPER) {
      if (!openCvLoaded) {
        setError('OpenCV aún no se ha cargado completamente. Por favor, esperá un momento.');
        return;
      }
      
      try {
        const cv = window.cv;
        
        // Obtener imagen desde el canvas
        const src = cv.imread(canvas);
        
        // Verificar que el pixel esté dentro de los límites
        if (x < 0 || x >= src.cols || y < 0 || y >= src.rows) {
          setError('Punto seleccionado fuera de los límites de la imagen.');
          src.delete();
          return;
        }
        
        // Convertir a HSV para mejor análisis de color
        const hsv = new cv.Mat();
        cv.cvtColor(src, hsv, cv.COLOR_BGR2HSV);
        
        // Obtener el color HSV del pixel seleccionado
        const pixel = hsv.ucharPtr(y, x);
        const selectedHsv = {
          h: pixel[0],
          s: pixel[1],
          v: pixel[2]
        };
        
        setSelectedColor(selectedHsv);
        
        // Crear rango de color basado en el pixel seleccionado y la tolerancia
        const lowerColor = new cv.Mat(1, 3, cv.CV_8UC1);
        const upperColor = new cv.Mat(1, 3, cv.CV_8UC1);
        
        // H tiene un rango circular (0-180), S y V son lineales (0-255)
        lowerColor.data[0] = Math.max(0, selectedHsv.h - colorTolerance);
        lowerColor.data[1] = Math.max(0, selectedHsv.s - colorTolerance);
        lowerColor.data[2] = Math.max(0, selectedHsv.v - colorTolerance);
        
        upperColor.data[0] = Math.min(180, selectedHsv.h + colorTolerance);
        upperColor.data[1] = Math.min(255, selectedHsv.s + colorTolerance);
        upperColor.data[2] = Math.min(255, selectedHsv.v + colorTolerance);
        
        console.log("Color seleccionado:", selectedHsv);
        console.log("Rango inferior:", lowerColor.data);
        console.log("Rango superior:", upperColor.data);
        
        // Crear máscara con inRange para objetos del color seleccionado
        const colorMask = new cv.Mat();
        cv.inRange(hsv, lowerColor, upperColor, colorMask);
        
        // Caso especial: si es un tono rojo (que en HSV está en los extremos)
        if (selectedHsv.h < colorTolerance || selectedHsv.h > 180 - colorTolerance) {
          console.log("Detectado color cercano al rojo, aplicando tratamiento especial");
          const lowerRed1 = new cv.Mat(1, 3, cv.CV_8UC1);
          const upperRed1 = new cv.Mat(1, 3, cv.CV_8UC1);
          const lowerRed2 = new cv.Mat(1, 3, cv.CV_8UC1);
          const upperRed2 = new cv.Mat(1, 3, cv.CV_8UC1);
          
          // Primera parte del rango (H: 0-10)
          lowerRed1.data[0] = 0;
          lowerRed1.data[1] = Math.max(0, selectedHsv.s - colorTolerance);
          lowerRed1.data[2] = Math.max(0, selectedHsv.v - colorTolerance);
          
          upperRed1.data[0] = colorTolerance;
          upperRed1.data[1] = Math.min(255, selectedHsv.s + colorTolerance);
          upperRed1.data[2] = Math.min(255, selectedHsv.v + colorTolerance);
          
          // Segunda parte del rango (H: 170-180)
          lowerRed2.data[0] = 180 - colorTolerance;
          lowerRed2.data[1] = Math.max(0, selectedHsv.s - colorTolerance);
          lowerRed2.data[2] = Math.max(0, selectedHsv.v - colorTolerance);
          
          upperRed2.data[0] = 180;
          upperRed2.data[1] = Math.min(255, selectedHsv.s + colorTolerance);
          upperRed2.data[2] = Math.min(255, selectedHsv.v + colorTolerance);
          
          // Crear máscaras separadas para cada rango
          const mask1 = new cv.Mat();
          const mask2 = new cv.Mat();
          cv.inRange(hsv, lowerRed1, upperRed1, mask1);
          cv.inRange(hsv, lowerRed2, upperRed2, mask2);
          
          // Combinar las máscaras
          cv.bitwise_or(mask1, mask2, colorMask);
          
          // Liberar memoria
          mask1.delete();
          mask2.delete();
          lowerRed1.delete();
          upperRed1.delete();
          lowerRed2.delete();
          upperRed2.delete();
        }
        
        // Mejorar la máscara con operaciones morfológicas
        const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
        
        // Cerrar huecos (dilatación seguida de erosión)
        const closedMask = new cv.Mat();
        cv.morphologyEx(colorMask, closedMask, cv.MORPH_CLOSE, kernel);
        
        // Remover ruido (erosión seguida de dilatación)
        const processedMask = new cv.Mat();
        cv.morphologyEx(closedMask, processedMask, cv.MORPH_OPEN, kernel);
        
        // Mostrar al usuario la máscara en modo debug si está activado
        if (debugMode) {
          // Visualizar la máscara
          const visualMask = new cv.Mat();
          cv.cvtColor(processedMask, visualMask, cv.COLOR_GRAY2RGBA);
          
          // Dibujar contornos para visualización
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();
          cv.findContours(processedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          
          // Dibujar contornos en la máscara visual
          const borderColor = new cv.Scalar(0, 0, 255, 255);
          for (let i = 0; i < contours.size(); i++) {
            cv.drawContours(visualMask, contours, i, borderColor, 2);
          }
          
          // Mostrar máscara
          cv.imshow(canvas, visualMask);
          
          // Liberar memoria
          visualMask.delete();
          contours.delete();
          hierarchy.delete();
          
          // Marcar que estamos mostrando máscara debug
          setShowingDebugMask(true);
          
          setSnackbarMessage('Mostrando máscara de color seleccionado. Presioná "Detectar con Cuentagotas" nuevamente para procesar.');
          setSnackbarOpen(true);
          
          // Liberar memoria
          hsv.delete();
          src.delete();
          lowerColor.delete();
          upperColor.delete();
          colorMask.delete();
          closedMask.delete();
          processedMask.delete();
          kernel.delete();
          
          return;
        }
        
        // Encontrar contornos en la máscara procesada
        const contours = new cv.MatVector();
        const hierarchy = new cv.Mat();
        cv.findContours(processedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        console.log(`Se encontraron ${contours.size()} contornos`);
        
        // Preparar imagen para visualización
        const displaySrc = new cv.Mat();
        src.copyTo(displaySrc);
        
        // Calcular umbral mínimo de área
        const minAreaThreshold = Math.max(500, canvas.width * canvas.height * 0.001);
        
        // Lista para almacenar moldes detectados
        const detectedMolds: Mold[] = [];
        
        // Definir colores para visualización
        const borderColor = new cv.Scalar(46, 125, 50, 255); // Verde
        const fillColor = new cv.Scalar(46, 125, 50, 180); // Verde semitransparente
        
        // Procesar cada contorno encontrado
        for (let i = 0; i < contours.size(); i++) {
          try {
            const contour = contours.get(i);
            if (!contour || !contour.data32S) {
              console.warn(`Contorno ${i} inválido, saltando`);
              continue;
            }
            
            // Calcular área del contorno
            const area = cv.contourArea(contour);
            
            // Ignorar contornos pequeños
            if (area > minAreaThreshold) {
              console.log(`Procesando contorno ${i} con área ${area}`);
              
              // Aproximar contorno para simplificarlo
              const approxCurve = new cv.Mat();
              const epsilon = 0.01 * cv.arcLength(contour, true);
              cv.approxPolyDP(contour, approxCurve, epsilon, true);
              
              // Convertir contorno a array de puntos
              const contourArray = [];
              for (let j = 0; j < approxCurve.data32S.length; j += 2) {
                if (j+1 < approxCurve.data32S.length) {
                  contourArray.push([approxCurve.data32S[j], approxCurve.data32S[j + 1]]);
                }
              }
              
              if (contourArray.length === 0) {
                console.warn(`Contorno ${i} no tiene puntos válidos, saltando`);
                approxCurve.delete();
                continue;
              }
              
              // Calcular área en cm² (si está calibrada)
              const areaInCm2 = calibrationFactor 
                ? calculateRealDimensions(contourArray, calibrationFactor).area
                : area;
              
              // Agregar el molde a la lista
              detectedMolds.push({
                id: detectedMolds.length,
                contour: contourArray,
                type: MoldType.CORTE, // Tipo predeterminado
                multiplier: 1, // Factor predeterminado
                area: area,
                areaInCm2: areaInCm2
              });
              
              // Dibujar contorno en la imagen original
              // Crear matriz para este contorno
              const singleContour = new cv.MatVector();
              singleContour.push_back(contour);
              
              // Dibujar relleno y borde
              cv.drawContours(displaySrc, singleContour, 0, fillColor, -1);
              cv.drawContours(displaySrc, singleContour, 0, borderColor, 3);
              
              // Liberar matriz
              singleContour.delete();
              
              // Mostrar número en el molde
              try {
                const momentos = cv.moments(contour);
                if (momentos.m00 !== 0) {
                  const cx = Math.floor(momentos.m10 / momentos.m00);
                  const cy = Math.floor(momentos.m01 / momentos.m00);
                  
                  // Dibujar círculo con número
                  cv.circle(displaySrc, new cv.Point(cx, cy), 25, new cv.Scalar(255, 255, 255, 255), -1);
                  cv.circle(displaySrc, new cv.Point(cx, cy), 25, new cv.Scalar(0, 0, 0, 255), 2);
                  
                  // Configurar texto
                  const font = cv.FONT_HERSHEY_SIMPLEX;
                  const text = `${detectedMolds.length}`;
                  const fontScale = 1.0;
                  const fontColor = new cv.Scalar(0, 0, 0, 255);
                  const thickness = 2;
                  
                  // Centrar texto
                  const textSize = cv.getTextSize(text, font, fontScale, thickness);
                  const textX = cx - (textSize.width / 2);
                  const textY = cy + (textSize.height / 2);
                  
                  // Dibujar número
                  cv.putText(
                    displaySrc, 
                    text, 
                    new cv.Point(textX, textY), 
                    font, 
                    fontScale, 
                    fontColor, 
                    thickness,
                    cv.LINE_AA
                  );
                }
              } catch (etiquetaError) {
                console.error('Error al dibujar etiqueta:', etiquetaError);
              }
              
              // Liberar memoria
              approxCurve.delete();
            }
          } catch (contourError) {
            console.error(`Error procesando contorno ${i}:`, contourError);
          }
        }
        
        // Mostrar la imagen con contornos detectados
        cv.imshow(canvas, displaySrc);
        
        // Actualizar estado
        setMoldsDetected(detectedMolds);
        
        // Salir del modo cuentagotas
        setSelectionMode(SelectionMode.NONE);
        
        // Mensaje de éxito/información
        if (detectedMolds.length > 0) {
          setSnackbarMessage(`Se han detectado ${detectedMolds.length} moldes usando el color seleccionado.`);
          setSnackbarOpen(true);
          setSnackbarSeverity('success');
        } else {
          setSnackbarMessage('No se detectaron moldes con el color seleccionado. Intentá con otro color o ajustá la tolerancia.');
          setSnackbarOpen(true);
          setSnackbarSeverity('warning');
        }
        
        // Liberar memoria
        hsv.delete();
        src.delete();
        lowerColor.delete();
        upperColor.delete();
        colorMask.delete();
        closedMask.delete();
        processedMask.delete();
        kernel.delete();
        contours.delete();
        hierarchy.delete();
        displaySrc.delete();
        
      } catch (err) {
        console.error('Error en modo cuentagotas:', err);
        setError(`Error al procesar el color seleccionado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    }
  }, [selectionMode, calibrationFactor, colorTolerance, debugMode, openCvLoaded]);
  
  // Iniciar calibración
  const startCalibration = useCallback(() => {
    // Limpiar puntos anteriores
    setCalibrationPoints([]);
    setCalibrationFactor(null);
    setIsCalibrating(true);
    setSelectionMode(SelectionMode.CALIBRATION);
    setActiveStep(ProcessStep.CALIBRATION);
    
    // Mostrar mensaje instructivo
    setSnackbarOpen(true);
    setSnackbarMessage('Seleccioná dos puntos en la regla a una distancia conocida (por defecto 10 cm).');
    setSnackbarSeverity('info');
    
    // Limpiar el canvas para empezar la calibración
    setTimeout(() => {
      if (redrawImageWithCalibrationGuideRef.current) {
        redrawImageWithCalibrationGuideRef.current();
      }
    }, 50);
  }, []);
  
  // Actualizar la event listener para mousemove cuando cambia el modo de selección
  useEffect(() => {
    if (selectionMode === SelectionMode.CALIBRATION && calibrationPoints.length === 1) {
      const canvas = canvasRef.current;
      if (canvas) {
        // Usar el manejador nativo
        canvas.addEventListener('mousemove', handleNativeMouseMove);
        document.addEventListener('keydown', handleEscapeKey);
        
        return () => {
          canvas.removeEventListener('mousemove', handleNativeMouseMove);
          document.removeEventListener('keydown', handleEscapeKey);
        };
      }
    }
  }, [selectionMode, calibrationPoints, handleNativeMouseMove, handleEscapeKey]);
  
  // Cargar la imagen
  useEffect(() => {
    // @ts-ignore
    const state = location?.state as { imageUrl: string } | null;
    
    if (state?.imageUrl) {
      setImageUrl(state.imageUrl);
      console.log('URL de imagen recibida:', state.imageUrl);
    } else {
      // Usar una imagen de ejemplo si no hay imagen proporcionada
      console.warn('No se recibió ninguna imagen. Usando imagen de ejemplo...');
      const exampleImageUrl = '/example-image.jpg';
      setImageUrl(exampleImageUrl);
      setError('No se recibió una imagen desde el paso anterior. Se está mostrando una imagen de ejemplo.');
    }
    
    // Función para verificar si OpenCV está completamente cargado
    const checkOpenCvLoaded = () => {
      return window.cv && typeof window.cv.imread === 'function';
    };
    
    // Verificar si OpenCV ya está cargado
    if (checkOpenCvLoaded()) {
      setOpenCvLoaded(true);
      console.log('OpenCV está completamente cargado');
    } else {
      console.log('Esperando a que OpenCV se cargue...');
      
      // Cargar OpenCV manualmente si no se ha cargado
      if (!window.cv) {
        console.log('Intentando cargar OpenCV manualmente...');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/opencv.js@1.2.1/opencv.min.js';
        script.async = true;
        script.onload = () => {
          console.log('OpenCV cargado manualmente');
          if (checkOpenCvLoaded()) {
            setOpenCvLoaded(true);
          }
        };
        document.body.appendChild(script);
      }
      
      // Esperar a que OpenCV se cargue con un intervalo
      const checkInterval = setInterval(() => {
        if (checkOpenCvLoaded()) {
          console.log('OpenCV cargado correctamente');
          setOpenCvLoaded(true);
          clearInterval(checkInterval);
        }
      }, 1000);
      
      // También escuchar al evento
      const handleOpenCvLoaded = () => {
        console.log('Evento opencv-loaded detectado');
        if (checkOpenCvLoaded()) {
          console.log('OpenCV cargado por evento');
          setOpenCvLoaded(true);
          clearInterval(checkInterval);
        }
      };
      
      window.addEventListener('opencv-loaded', handleOpenCvLoaded);
      
      // Limpiar intervalo después de 20 segundos para evitar memoria leak
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!openCvLoaded) {
          setError('No se pudo cargar OpenCV después de varios intentos. Intentá recargar la página y asegurate de tener una conexión estable a internet.');
        }
      }, 20000);
      
      return () => {
        clearInterval(checkInterval);
        window.removeEventListener('opencv-loaded', handleOpenCvLoaded);
      };
    }
  }, [location]);
  
  // Procesar la imagen cuando esté disponible y OpenCV esté cargado
  useEffect(() => {
    if (imageUrl) {
      console.log('Cargando imagen desde URL:', imageUrl);
      const img = new Image();
      
      img.onload = () => {
        console.log('Imagen cargada correctamente:', img.width, 'x', img.height);
        imageRef.current = img;
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          
          // Ajustar tamaño del canvas al de la imagen
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Dibujar la imagen en el canvas
          if (ctx) {
            ctx.drawImage(img, 0, 0, img.width, img.height);
          }
        }
      };
      
      img.onerror = (err) => {
        console.error('Error al cargar la imagen:', err);
        setError('No se pudo cargar la imagen. Verifica que el formato sea válido (JPG, PNG) y que la URL sea correcta.');
      };
      
      img.src = imageUrl;
    }
  }, [imageUrl]);
  
  // Función para restaurar la imagen original (útil cuando se está en modo debug)
  const restoreOriginalImage = useCallback(() => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Limpiar el canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Redibujar la imagen original
    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    
    // Marcar que ya no estamos mostrando la máscara de debug
    setShowingDebugMask(false);
  }, [imageRef]);
  
  // Procesar imagen con OpenCV - con mejoras para detectar objetos blancos
  const processImage = () => {
    if (!calibrationFactor) {
      alert('Por favor, calibrá la imagen primero.');
      return;
    }
    
    if (!openCvLoaded) {
      alert('OpenCV aún no se ha cargado completamente. Por favor, esperá un momento.');
      return;
    }
    
    // Si estamos mostrando una máscara de debug, primero restaurar la imagen original
    if (showingDebugMask) {
      restoreOriginalImage();
    }
    
    setIsProcessing(true);
    setError(null); // Limpiar errores anteriores
    
    try {
      const cv = window.cv;
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      // Guardar la imagen original para poder restaurarla después
      const originalImg = new Image();
      originalImg.src = canvas.toDataURL();
      
      // Obtener imagen desde el canvas
      const src = cv.imread(canvas);
      
      // Preparar una copia para visualización final
      const displaySrc = new cv.Mat();
      src.copyTo(displaySrc);
      
      // Variable para almacenar la máscara final que contendrá los objetos detectados
      let processedMask = new cv.Mat();
      
      if (detectionMode === 'white') {
        // ---- MODO OBJETO BLANCO (ESTRATEGIA HSV) ----
        
        // 1. Convertir a HSV
        const hsv = new cv.Mat();
        cv.cvtColor(src, hsv, cv.COLOR_BGR2HSV);
        
        // 2. Aplicar desenfoque Gaussiano para reducir ruido
        const blurredHsv = new cv.Mat();
        cv.GaussianBlur(hsv, blurredHsv, new cv.Size(5, 5), 0);
        
        // 3. Definir rango HSV para objetos blancos
        const lowerWhite = new cv.Mat(1, 3, cv.CV_8UC1);
        const upperWhite = new cv.Mat(1, 3, cv.CV_8UC1);
        
        // Asignar valores de los rangos HSV
        lowerWhite.data[0] = hsvParams.hMin;
        lowerWhite.data[1] = hsvParams.sMin;
        lowerWhite.data[2] = hsvParams.vMin;
        
        upperWhite.data[0] = hsvParams.hMax;
        upperWhite.data[1] = hsvParams.sMax;
        upperWhite.data[2] = hsvParams.vMax;
        
        // 4. Crear máscara con inRange para objetos blancos
        const whiteMask = new cv.Mat();
        cv.inRange(blurredHsv, lowerWhite, upperWhite, whiteMask);
        
        // 5. Postprocesamiento de la máscara
        // Aplicar operaciones morfológicas para mejorar la detección
        const kernel = cv.Mat.ones(5, 5, cv.CV_8U);
        
        // Realizar "closing" (dilatación seguida de erosión) para cerrar huecos
        const closedMask = new cv.Mat();
        cv.morphologyEx(whiteMask, closedMask, cv.MORPH_CLOSE, kernel);
        
        // Realizar "opening" (erosión seguida de dilatación) para eliminar ruido pequeño
        const openedMask = new cv.Mat();
        cv.morphologyEx(closedMask, openedMask, cv.MORPH_OPEN, kernel);
        
        // Operación adicional para reforzar la detección - dilatación
        cv.dilate(openedMask, processedMask, kernel, new cv.Point(-1, -1), 2);
        
        // 6. Modo DEBUG - Mostrar cada paso del procesamiento
        if (debugMode) {
          // Crear visualización más clara de la máscara
          const visualMask = new cv.Mat();
          cv.cvtColor(processedMask, visualMask, cv.COLOR_GRAY2RGBA);
          
          // Dibujar borde para hacer la máscara más visible
          const borderColor = new cv.Scalar(0, 0, 255, 255);
          const contours = new cv.MatVector();
          const hierarchy = new cv.Mat();
          cv.findContours(processedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
          
          // Dibujar contornos en la máscara visual con color rojo
          for (let i = 0; i < contours.size(); i++) {
            cv.drawContours(visualMask, contours, i, borderColor, 2);
          }
          
          // Mostrar la máscara resultante
          cv.imshow(canvas, visualMask);
          
          // Liberar memoria
          visualMask.delete();
          contours.delete();
          hierarchy.delete();
          
          // Guardar estado para saber que estamos mostrando una máscara
          setShowingDebugMask(true);
          
          // Liberar el resto de la memoria
          hsv.delete();
          blurredHsv.delete();
          lowerWhite.delete();
          upperWhite.delete();
          whiteMask.delete();
          closedMask.delete();
          openedMask.delete();
          kernel.delete();
          src.delete();
          displaySrc.delete();
          processedMask.delete();
          
          // Mensaje informativo con instrucción clara para el usuario
          setSnackbarMessage('Mostrando máscara de detección en modo DEBUG. Presioná "Detectar Moldes" nuevamente para procesar la imagen real.');
          setSnackbarOpen(true);
          setIsProcessing(false);
          return;
        }
        
        // Liberar memoria de objetos intermedios
        hsv.delete();
        blurredHsv.delete();
        lowerWhite.delete();
        upperWhite.delete();
        whiteMask.delete();
        closedMask.delete();
        openedMask.delete();
        kernel.delete();
      } else {
        // ---- MODOS TRADICIONALES (NORMAL, INVERTIDO, ADAPTATIVO) ----
        
        // Convertir a escala de grises
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
        
        // Aplicar un ligero desenfoque para reducir ruido
        const blurred = new cv.Mat();
        cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
        
        // Diferentes técnicas de umbral según el modo seleccionado
        if (detectionMode === 'normal') {
          // Modo normal: detecta objetos claros (como moldes blancos)
          cv.threshold(blurred, processedMask, thresholdValue, 255, cv.THRESH_BINARY);
        } 
        else if (detectionMode === 'inverse') {
          // Modo invertido: detecta objetos oscuros
          cv.threshold(blurred, processedMask, thresholdValue, 255, cv.THRESH_BINARY_INV);
        }
        else { // Modo adaptativo (por defecto)
          // Usar un umbral adaptativo para detectar tanto objetos oscuros como claros
          const thresh1 = new cv.Mat();
          cv.adaptiveThreshold(blurred, thresh1, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 21, 5);
          
          // También probar con un umbral normal para objetos claros (como el molde blanco)
          const thresh2 = new cv.Mat();
          cv.threshold(blurred, thresh2, thresholdValue, 255, cv.THRESH_BINARY);
          
          // Combinar ambos umbrales
          cv.bitwise_or(thresh1, thresh2, processedMask);
          
          // Liberar memoria
          thresh1.delete();
          thresh2.delete();
        }
        
        // Aplicar operaciones morfológicas
        const kernel = cv.Mat.ones(7, 7, cv.CV_8U);
        const morphed = new cv.Mat();
        cv.morphologyEx(processedMask, morphed, cv.MORPH_CLOSE, kernel);
        
        // Eliminar ruido pequeño
        const smallKernel = cv.Mat.ones(3, 3, cv.CV_8U);
        const cleaned = new cv.Mat();
        cv.morphologyEx(morphed, cleaned, cv.MORPH_OPEN, smallKernel);
        
        // Obtener máscara final
        processedMask = cleaned.clone();
        
        // Liberar memoria
        gray.delete();
        blurred.delete();
        morphed.delete();
        cleaned.delete();
        kernel.delete();
        smallKernel.delete();
        
        // Modo DEBUG
        if (debugMode) {
          // Crear visualización más clara de la máscara
          const visualMask = new cv.Mat();
          cv.cvtColor(processedMask, visualMask, cv.COLOR_GRAY2RGBA);
          
          // Mostrar la máscara de umbral
          cv.imshow(canvas, visualMask);
          
          // Marcar que estamos en modo debug
          setShowingDebugMask(true);
          
          // Liberar memoria
          visualMask.delete();
          src.delete();
          displaySrc.delete();
          processedMask.delete();
          
          // Mensaje informativo con instrucción clara
          setSnackbarMessage('Mostrando máscara de umbral en modo DEBUG. Presioná "Detectar Moldes" nuevamente para procesar la imagen real.');
          setSnackbarOpen(true);
          setIsProcessing(false);
          return;
        }
      }
      
      // Encontrar contornos en la máscara procesada
      const contours = new cv.MatVector();
      const hierarchy = new cv.Mat();
      cv.findContours(processedMask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      
      console.log(`Se encontraron ${contours.size()} contornos`);
      
      // Calcular un umbral de área mínimo basado en el tamaño de la imagen
      const minAreaThreshold = Math.max(1000, canvas.width * canvas.height * 0.002);
      
      // Lista para almacenar los moldes detectados
      const detectedMolds: Mold[] = [];
      
      // Definir colores para los diferentes tipos
      const colorMap = {
        [MoldType.CORTE]: new cv.Scalar(46, 125, 50, 255), // Verde
        [MoldType.FORRO]: new cv.Scalar(156, 39, 176, 255), // Púrpura
        [MoldType.OTRO]: new cv.Scalar(255, 152, 0, 255)  // Naranja
      };
      
      // Procesar cada contorno
      for (let i = 0; i < contours.size(); i++) {
        try {
          const contour = contours.get(i);
          if (!contour || !contour.data32S) {
            console.warn(`Contorno ${i} inválido, saltando`);
            continue;
          }
          
          // Calcular el área del contorno
          const area = cv.contourArea(contour);
          
          // Ignorar contornos pequeños
          if (area > minAreaThreshold) {
            console.log(`Procesando contorno ${i} con área ${area}`);
            
            // Aproximar el contorno para simplificarlo
            const approxCurve = new cv.Mat();
            const epsilon = 0.01 * cv.arcLength(contour, true);
            cv.approxPolyDP(contour, approxCurve, epsilon, true);
            
            // Convertir contorno a array de puntos
            const contourArray = [];
            for (let j = 0; j < approxCurve.data32S.length; j += 2) {
              if (j+1 < approxCurve.data32S.length) {
                contourArray.push([approxCurve.data32S[j], approxCurve.data32S[j + 1]]);
              }
            }
            
            if (contourArray.length === 0) {
              console.warn(`Contorno ${i} no tiene puntos válidos, saltando`);
              approxCurve.delete();
              continue;
            }
            
            // Calcular área en cm²
            const areaInCm2 = calculateRealDimensions(contourArray, calibrationFactor).area;
            
            // Agregar el molde a la lista
            detectedMolds.push({
              id: detectedMolds.length,
              contour: contourArray,
              type: MoldType.CORTE, // Tipo predeterminado
              multiplier: 1, // Factor predeterminado
              area: area,
              areaInCm2: areaInCm2
            });
            
            // Obtener colores con alta opacidad
            const borderColor = colorMap[MoldType.CORTE];
            const fillColor = new cv.Scalar(
              borderColor.data[0], 
              borderColor.data[1], 
              borderColor.data[2], 
              180 // Mayor opacidad
            );
            
            // Matriz para este contorno específico
            const singleContour = new cv.MatVector();
            singleContour.push_back(contour);
            
            // Dibujar contorno relleno con mayor opacidad
            cv.drawContours(displaySrc, singleContour, 0, fillColor, -1);
            
            // Dibujar borde más grueso
            cv.drawContours(displaySrc, singleContour, 0, borderColor, 4, cv.LINE_8, hierarchy, 0);
            
            // Liberar memoria
            singleContour.delete();
            
            // Dibujar etiqueta con número
            try {
              const momentos = cv.moments(contour);
              if (momentos.m00 !== 0) {
                const cx = Math.floor(momentos.m10 / momentos.m00);
                const cy = Math.floor(momentos.m01 / momentos.m00);
                
                // Dibujar círculo con número
                cv.circle(displaySrc, new cv.Point(cx, cy), 25, new cv.Scalar(255, 255, 255, 255), -1);
                cv.circle(displaySrc, new cv.Point(cx, cy), 25, new cv.Scalar(0, 0, 0, 255), 2);
                
                // Configurar texto
                const font = cv.FONT_HERSHEY_SIMPLEX;
                const text = `${detectedMolds.length}`;
                const fontScale = 1.0;
                const fontColor = new cv.Scalar(0, 0, 0, 255);
                const thickness = 2;
                
                // Calcular tamaño del texto para centrarlo
                const textSize = cv.getTextSize(text, font, fontScale, thickness);
                const textX = cx - (textSize.width / 2);
                const textY = cy + (textSize.height / 2);
                
                // Dibujar número
                cv.putText(
                  displaySrc, 
                  text, 
                  new cv.Point(textX, textY), 
                  font, 
                  fontScale, 
                  fontColor, 
                  thickness,
                  cv.LINE_AA
                );
              }
            } catch (etiquetaError) {
              console.error('Error al dibujar etiqueta:', etiquetaError);
            }
            
            // Liberar memoria
            approxCurve.delete();
          }
        } catch (contourError) {
          console.error(`Error procesando contorno ${i}:`, contourError);
        }
      }
      
      console.log(`Se han detectado ${detectedMolds.length} moldes`);
      
      // Mostrar resultados
      if (detectedMolds.length > 0) {
        // Aplicar un filtro para resaltar mejor los contornos
        const enhancedDisplay = new cv.Mat();
        cv.addWeighted(displaySrc, 1.2, displaySrc, 0, 0, enhancedDisplay);
        
        // Mostrar imagen final
        cv.imshow(canvas, enhancedDisplay);
        enhancedDisplay.delete();
      } else {
        // No se detectaron moldes
        cv.imshow(canvas, displaySrc);
      }
      
      // Actualizar estado
      setMoldsDetected(detectedMolds);
      
      // Liberar memoria
      src.delete();
      displaySrc.delete();
      processedMask.delete();
      contours.delete();
      hierarchy.delete();
      
      setIsProcessing(false);
      
      // Mensaje de éxito/información
      if (detectedMolds.length > 0) {
        setSnackbarMessage(`Se han detectado ${detectedMolds.length} moldes. Ahora podés clasificarlos y ajustar los parámetros.`);
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage('No se detectaron moldes. Intentá con otros parámetros de detección o usa la selección manual.');
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('Error al procesar la imagen:', err);
      setError(`Ocurrió un error al procesar la imagen: ${err instanceof Error ? err.message : 'Error desconocido'}. Intentá nuevamente o ajusta los parámetros.`);
      setIsProcessing(false);
      
      // Si hay un error, asegurarse de restaurar la imagen original
      if (showingDebugMask) {
        restoreOriginalImage();
      }
    }
  };
  
  // Resaltar molde seleccionado en el canvas
  useEffect(() => {
    if (selectedMold !== null && moldsDetected.length > 0 && canvasRef.current) {
      const canvas = canvasRef.current;
      
      // Solo intentar resaltar si tenemos OpenCV disponible
      if (!openCvLoaded || !window.cv || typeof window.cv.imread !== 'function') {
        return;
      }
      
      try {
        // Buscar el molde seleccionado
        const selectedMoldData = moldsDetected.find(m => m.id === selectedMold);
        if (!selectedMoldData || !selectedMoldData.contour || selectedMoldData.contour.length === 0) {
          console.warn('Molde seleccionado no tiene contorno válido');
          return;
        }
        
        // Hacer una copia de seguridad de la imagen actual
        const backupCanvas = document.createElement('canvas');
        backupCanvas.width = canvas.width;
        backupCanvas.height = canvas.height;
        const backupCtx = backupCanvas.getContext('2d');
        if (!backupCtx) return;
        backupCtx.drawImage(canvas, 0, 0);
        
        // Obtener la imagen del canvas
        const src = window.cv.imread(canvas);
        
        // Crear un contorno para OpenCV
        try {
          const contourPoints = selectedMoldData.contour;
          
          // Convertir puntos del contorno al formato que OpenCV necesita
          const contour = new window.cv.Mat(contourPoints.length, 1, window.cv.CV_32SC2);
          
          // Asignar los puntos de manera más segura
          for (let i = 0; i < contourPoints.length; i++) {
            contour.data32S[i * 2] = contourPoints[i][0];
            contour.data32S[i * 2 + 1] = contourPoints[i][1];
          }
          
          const contours = new window.cv.MatVector();
          contours.push_back(contour);
          
          // Obtener el color según el tipo
          const colorMap = {
            [MoldType.CORTE]: new window.cv.Scalar(46, 125, 50, 255), // Verde
            [MoldType.FORRO]: new window.cv.Scalar(156, 39, 176, 255), // Púrpura
            [MoldType.OTRO]: new window.cv.Scalar(255, 152, 0, 255)  // Naranja
          };
          
          const borderColor = colorMap[selectedMoldData.type];
          const fillColor = new window.cv.Scalar(
            borderColor.data[0], 
            borderColor.data[1], 
            borderColor.data[2], 
            150 // Más opaco para destacar
          );
          
          // Dibujar un efecto de "enfoque" en el molde seleccionado
          // Primero, dibujar un overlay semi-transparente sobre toda la imagen para "oscurecer" el resto
          const overlayMat = new window.cv.Mat(src.rows, src.cols, src.type(), new window.cv.Scalar(255, 255, 255, 100));
          window.cv.addWeighted(src, 0.7, overlayMat, 0.3, 0, src);
          
          // Luego dibujar el contorno seleccionado con colores más vivos
          window.cv.drawContours(src, contours, 0, fillColor, -1); // Rellenar
          window.cv.drawContours(src, contours, 0, borderColor, 3); // Borde
          
          // Añadir un efecto de brillo alrededor del contorno seleccionado (halo)
          const glowColor = new window.cv.Scalar(255, 255, 255, 150); 
          window.cv.drawContours(src, contours, 0, glowColor, 6); // Borde exterior más grueso
          window.cv.drawContours(src, contours, 0, borderColor, 3); // Borde interior
          
          // Añadir número sobre el molde
          try {
            // Calcular centro del contorno
            const M = window.cv.moments(contour);
            if (M.m00 !== 0) {
              const cx = Math.floor(M.m10 / M.m00);
              const cy = Math.floor(M.m01 / M.m00);
              
              // Dibujar círculo con número
              window.cv.circle(src, new window.cv.Point(cx, cy), 20, new window.cv.Scalar(255, 255, 255, 255), -1);
              window.cv.circle(src, new window.cv.Point(cx, cy), 20, new window.cv.Scalar(0, 0, 0, 255), 2);
              
              // Configurar texto
              const font = window.cv.FONT_HERSHEY_SIMPLEX;
              const text = `${selectedMold + 1}`;
              const fontScale = 0.8;
              const fontColor = new window.cv.Scalar(0, 0, 0, 255);
              const thickness = 2;
              
              // Obtener tamaño del texto para centrarlo
              const textSize = window.cv.getTextSize(text, font, fontScale, thickness);
              const textX = cx - (textSize.width / 2);
              const textY = cy + (textSize.height / 2);
              
              // Dibujar número
              window.cv.putText(
                src, 
                text, 
                new window.cv.Point(textX, textY), 
                font, 
                fontScale, 
                fontColor, 
                thickness,
                window.cv.LINE_AA
              );
            }
          } catch (textErr) {
            console.error('Error al dibujar texto en el molde resaltado:', textErr);
          }
          
          // Mostrar la imagen modificada
          window.cv.imshow(canvas, src);
          
          // Liberar recursos
          src.delete();
          contour.delete();
          contours.delete();
          overlayMat.delete();
          
        } catch (contourError) {
          console.error('Error al procesar contorno para resaltado:', contourError);
          // Restaurar la imagen original si hay un error
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(backupCanvas, 0, 0);
          }
        }
      } catch (err) {
        console.error('Error al resaltar molde:', err);
      }
    }
  }, [selectedMold, moldsDetected, openCvLoaded]);
  
  // Cambiar tipo de molde
  const changeMoldType = (id: number, type: MoldType) => {
    setMoldsDetected(prevMolds => 
      prevMolds.map(mold => 
        mold.id === id ? { ...mold, type } : mold
      )
    );
  };
  
  // Cambiar multiplicador
  const changeMoldMultiplier = (id: number, multiplier: number) => {
    setMoldsDetected(prevMolds => 
      prevMolds.map(mold => 
        mold.id === id ? { ...mold, multiplier } : mold
      )
    );
  };
  
  // Eliminar molde
  const deleteMold = (id: number) => {
    setMoldsDetected(prevMolds => prevMolds.filter(mold => mold.id !== id));
    if (selectedMold === id) {
      setSelectedMold(null);
    }
  };
  
  // Calcular resultados
  const calculateResults = () => {
    if (moldsDetected.length === 0) {
      alert('No hay moldes para calcular.');
      return;
    }
    
    // Agrupar por tipo
    const resultsByType: Record<string, { count: number, totalArea: number, totalAreaWithMultiplier: number }> = {};
    
    moldsDetected.forEach(mold => {
      if (!resultsByType[mold.type]) {
        resultsByType[mold.type] = { count: 0, totalArea: 0, totalAreaWithMultiplier: 0 };
      }
      
      resultsByType[mold.type].count++;
      resultsByType[mold.type].totalArea += mold.areaInCm2;
      resultsByType[mold.type].totalAreaWithMultiplier += mold.areaInCm2 * mold.multiplier;
    });
    
    // Calcular total general
    let totalCount = 0;
    let totalArea = 0;
    let totalAreaWithMultiplier = 0;
    
    Object.values(resultsByType).forEach(typeResult => {
      totalCount += typeResult.count;
      totalArea += typeResult.totalArea;
      totalAreaWithMultiplier += typeResult.totalAreaWithMultiplier;
    });
    
    setResults({
      byType: resultsByType,
      total: {
        count: totalCount,
        totalArea,
        totalAreaWithMultiplier
      }
    });
    
    setActiveStep(ProcessStep.RESULTS);
  };
  
  // Volver a la página principal
  const handleBack = () => {
    navigate('/');
  };
  
  // Obtener color según tipo de molde
  const getMoldTypeColor = (type: MoldType) => {
    switch (type) {
      case MoldType.CORTE:
        return theme.palette.primary.main;
      case MoldType.FORRO:
        return theme.palette.secondary.main;
      case MoldType.OTRO:
        return theme.palette.warning.main;
      default:
        return theme.palette.info.main;
    }
  };
  
  // Aplicar clasificación rápida
  const applyQuickClassification = () => {
    if (tempMoldId !== null) {
      changeMoldType(tempMoldId, tempMoldType);
      setShowClassificationDialog(false);
      setSnackbarMessage(`Molde clasificado como ${tempMoldType}`);
      setSnackbarOpen(true);
    }
  };
  
  // Contenido del tutorial
  const tutorialSteps = [
    {
      title: "Bienvenido a la Medición de Moldes",
      content: "Te guiaré paso a paso para medir el área de tus moldes. Es muy sencillo.",
      action: "Siguiente"
    },
    {
      title: "Paso 1: Calibrar la escala",
      content: "Primero debes calibrar la imagen usando la regla visible. Haz clic en 'Calibrar Escala' y selecciona dos puntos en la regla.",
      action: "Siguiente"
    },
    {
      title: "Paso 2: Seleccionar moldes",
      content: "Puedes detectar moldes de dos formas: automáticamente con 'Detectar Moldes' o manualmente con la herramienta 'Selección Manual'.",
      action: "Siguiente"
    },
    {
      title: "Paso 3: Clasificar moldes",
      content: "Después de seleccionar un molde, puedes clasificarlo como Corte, Forro u Otro, y ajustar su multiplicador.",
      action: "Siguiente"
    },
    {
      title: "Paso 4: Ver resultados",
      content: "Finalmente, haz clic en 'Calcular Resultados' para obtener las áreas totales por tipo.",
      action: "¡Empezar!"
    }
  ];
  
  // Función para iniciar el modo cuentagotas
  const startEyedropper = useCallback(() => {
    setSelectionMode(SelectionMode.EYEDROPPER);
    setSnackbarMessage('Hacé clic en cualquier parte del molde para detectar áreas del mismo color. Ajustá la tolerancia según sea necesario.');
    setSnackbarOpen(true);
    setSnackbarSeverity('info');
  }, []);
  
  // Función para calcular dimensiones reales del rectángulo
  const calculateRealDimensions = (contour: number[][], calibFactor: number) => {
    // Si hay muy pocos puntos, no podemos calcular dimensiones precisas
    if (contour.length < 4) {
      // Método simple basado en puntos extremos (menos preciso)
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      
      for (const point of contour) {
        minX = Math.min(minX, point[0]);
        maxX = Math.max(maxX, point[0]);
        minY = Math.min(minY, point[1]);
        maxY = Math.max(maxY, point[1]);
      }
      
      const widthInPixels = maxX - minX;
      const heightInPixels = maxY - minY;
      
      const widthInCm = widthInPixels * calibFactor;
      const heightInCm = heightInPixels * calibFactor;
      
      return {
        width: widthInCm,
        height: heightInCm,
        area: widthInCm * heightInCm
      };
    }
    
    // Método avanzado usando el rectángulo rotado mínimo (más preciso)
    // Encontrar el centro del contorno
    let sumX = 0;
    let sumY = 0;
    
    for (const point of contour) {
      sumX += point[0];
      sumY += point[1];
    }
    
    const centerX = sumX / contour.length;
    const centerY = sumY / contour.length;
    
    // Calcular los principales vectores de dirección (PCA simplificado)
    let covXX = 0;
    let covXY = 0;
    let covYY = 0;
    
    for (const point of contour) {
      const dx = point[0] - centerX;
      const dy = point[1] - centerY;
      
      covXX += dx * dx;
      covXY += dx * dy;
      covYY += dy * dy;
    }
    
    // Normalizar
    covXX /= contour.length;
    covXY /= contour.length;
    covYY /= contour.length;
    
    // Calcular ángulo de rotación
    const theta = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
    
    // Vectores principales
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    
    // Proyectar puntos sobre los ejes principales
    let minProj1 = Infinity;
    let maxProj1 = -Infinity;
    let minProj2 = Infinity;
    let maxProj2 = -Infinity;
    
    for (const point of contour) {
      const dx = point[0] - centerX;
      const dy = point[1] - centerY;
      
      // Proyecciones sobre los ejes principales
      const proj1 = dx * cosTheta + dy * sinTheta;
      const proj2 = -dx * sinTheta + dy * cosTheta;
      
      minProj1 = Math.min(minProj1, proj1);
      maxProj1 = Math.max(maxProj1, proj1);
      minProj2 = Math.min(minProj2, proj2);
      maxProj2 = Math.max(maxProj2, proj2);
    }
    
    // Dimensiones en píxeles
    const widthInPixels = maxProj1 - minProj1;
    const heightInPixels = maxProj2 - minProj2;
    
    // Convertir a cm
    const widthInCm = widthInPixels * calibFactor;
    const heightInCm = heightInPixels * calibFactor;
    
    return {
      width: widthInCm,
      height: heightInCm,
      area: widthInCm * heightInCm
    };
  };
  
  // Función para obtener dimensiones formateadas del molde
  const getMoldDimensions = (contour: number[][], factor: number) => {
    const dimensions = calculateRealDimensions(contour, factor);
    // Ordenar dimensiones para que ancho sea siempre la mayor
    const width = Math.max(dimensions.width, dimensions.height).toFixed(1);
    const height = Math.min(dimensions.width, dimensions.height).toFixed(1);
    return `${width} × ${height} cm (${dimensions.area.toFixed(2)} cm²)`;
  };
  
  return (
    <>
      <AppBar position="static" elevation={0} color="primary">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Procesamiento de Imagen
          </Typography>
          <Tooltip title="Abrir guía de ayuda">
            <IconButton color="inherit" onClick={() => setShowTutorial(true)}>
              <Help />
            </IconButton>
          </Tooltip>
          <Chip 
            label={`Paso ${activeStep + 1}/3`} 
            color="primary" 
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 'bold' }}
          />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            <Step key="calibracion">
              <StepLabel>Calibración</StepLabel>
              <StepContent>
                <Typography variant="body2">
                  Establece la escala de la imagen usando una referencia conocida
                </Typography>
              </StepContent>
            </Step>
            <Step key="deteccion">
              <StepLabel>Detección</StepLabel>
              <StepContent>
                <Typography variant="body2">
                  Detecta y clasifica los moldes en la imagen
                </Typography>
              </StepContent>
            </Step>
            <Step key="resultados">
              <StepLabel>Resultados</StepLabel>
              <StepContent>
                <Typography variant="body2">
                  Visualiza las áreas totales calculadas
                </Typography>
              </StepContent>
            </Step>
          </Stepper>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={3}>
            {/* Panel izquierdo: Canvas y controles principales */}
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 8' } }}>
              <Fade in={true} timeout={800}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    mb: 3, 
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: 'auto', 
                    mb: 2,
                    '&:hover .canvas-actions': {
                      opacity: 1
                    }
                  }}>
                    <canvas 
                      ref={canvasRef}
                      onClick={handleCanvasClick}
                      onMouseMove={handleMouseMoveCalibration}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '70vh',
                        border: '1px solid rgba(0,0,0,0.1)',
                        borderRadius: '8px',
                        cursor: selectionMode === SelectionMode.CALIBRATION 
                          ? 'crosshair' 
                          : selectionMode === SelectionMode.MANUAL_SELECTION
                            ? 'cell'
                            : 'default',
                        boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
                      }}
                    />
                    
                    {/* Botones flotantes sobre el canvas */}
                    <Box className="canvas-actions" sx={{ 
                      position: 'absolute', 
                      top: 10,
                      right: 10,
                      opacity: 0.7,
                      transition: 'opacity 0.3s ease',
                      zIndex: 10
                    }}>
                      <Tooltip title="Selección manual (tipo Paint)">
                        <Fab 
                          size="small" 
                          color={selectionMode === SelectionMode.MANUAL_SELECTION ? "secondary" : "default"}
                          sx={{ mb: 1, mr: 1 }}
                          onClick={() => setShowTutorial(true)}
                          disabled={!openCvLoaded || isProcessing}
                        >
                          <FormatPaint />
                        </Fab>
                      </Tooltip>
                      <Tooltip title="Mostrar guía">
                        <Fab 
                          size="small" 
                          color="info"
                          sx={{ mb: 1 }}
                          onClick={() => setShowTutorial(true)}
                        >
                          <Help />
                        </Fab>
                      </Tooltip>
                    </Box>
                    
                    {isProcessing && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: 2,
                        }}
                      >
                        <CircularProgress size={60} color="primary" />
                        <Typography variant="h6" sx={{ mt: 2 }}>
                          Procesando imagen...
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={2} justifyContent="center">
                      <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                        <Tooltip title="Establece la escala seleccionando dos puntos a una distancia conocida">
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Straighten />}
                            onClick={startCalibration}
                            disabled={!imageUrl || isProcessing || activeStep > ProcessStep.CALIBRATION}
                            color="primary"
                            sx={{ 
                              py: 1.5, 
                              bgcolor: activeStep === ProcessStep.CALIBRATION ? theme.palette.primary.main : 'grey.300',
                              color: activeStep === ProcessStep.CALIBRATION ? 'white' : 'text.secondary',
                            }}
                          >
                            Calibrar Escala
                          </Button>
                        </Tooltip>
                      </Grid>
                      <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                        <Tooltip title="Selecciona un molde manualmente (como el balde de pintura en Paint)">
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<FormatPaint />}
                            onClick={() => setShowTutorial(true)}
                            disabled={!imageUrl || isProcessing}
                            color="info"
                            sx={{ py: 1.5 }}
                          >
                            Selección Manual
                          </Button>
                        </Tooltip>
                      </Grid>
                      <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                        <Tooltip title="Detecta los contornos de los moldes automáticamente">
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<SquareFoot />}
                            onClick={processImage}
                            disabled={!imageUrl || isProcessing || !calibrationFactor || activeStep > ProcessStep.DETECTION}
                            color="secondary"
                            sx={{ 
                              py: 1.5,
                              bgcolor: activeStep === ProcessStep.DETECTION ? theme.palette.secondary.main : 'grey.300',
                              color: activeStep === ProcessStep.DETECTION ? 'white' : 'text.secondary',
                            }}
                          >
                            Detectar Moldes
                          </Button>
                        </Tooltip>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Opciones de detección avanzadas */}
                  <Fade in={true} timeout={500}>
                    <Paper 
                      elevation={1} 
                      sx={{ 
                        p: 2, 
                        mb: 2, 
                        bgcolor: 'background.paper', 
                        border: '1px dashed rgba(0,0,0,0.1)',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoFixHigh fontSize="small" color="primary" />
                        Ajustes de detección avanzados:
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Modo de detección:
                        </Typography>
                        <Grid container spacing={1}>
                          {detectionModes.map((mode) => (
                            <Grid key={mode.value} sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
                              <Tooltip title={mode.description}>
                                <Button
                                  fullWidth
                                  variant={detectionMode === mode.value ? "contained" : "outlined"}
                                  onClick={() => setDetectionMode(mode.value as any)}
                                  color={detectionMode === mode.value ? "primary" : "inherit"}
                                  size="small"
                                  sx={{ 
                                    textTransform: 'none',
                                    py: 0.5,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  {mode.label}
                                </Button>
                              </Tooltip>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Umbral de detección: {thresholdValue}</span>
                          <span style={{ opacity: 0.7 }}>(Menor = detecta más objetos)</span>
                        </Typography>
                        <Slider
                          value={thresholdValue}
                          min={50}
                          max={245}
                          step={5}
                          onChange={(_, value) => setThresholdValue(value as number)}
                          color="primary"
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      </Box>
                      
                      <Box sx={{ 
                        p: 1, 
                        bgcolor: 'info.light', 
                        color: 'info.dark',
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 1
                      }}>
                        <InfoOutlined fontSize="small" sx={{ mt: 0.2 }} />
                        <Typography variant="caption">
                          Si el molde no se detecta automáticamente, probá cambiar el modo de detección o usar la selección manual.
                        </Typography>
                      </Box>
                    </Paper>
                  </Fade>
                  
                  {isCalibrating && (
                    <Grow in={true} timeout={500}>
                      <Alert 
                        severity="info" 
                        icon={<TouchApp />}
                        sx={{ 
                          mb: 2, 
                          borderRadius: 2,
                          '& .MuiAlert-message': {
                            width: '100%'
                          }
                        }}
                      >
                        <AlertTitle sx={{ fontWeight: 'bold' }}>Calibración en proceso</AlertTitle>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            <strong>Instrucciones:</strong>
                          </Typography>
                          <ol style={{ paddingLeft: '20px', margin: '8px 0' }}>
                            <li>Clickeá en un extremo de la regla (el punto 0cm)</li>
                            <li>Luego clickeá en otro punto de la regla (por ejemplo, a 10cm del primero)</li>
                            <li>Es importante que la distancia entre los puntos sea exactamente la que indiques abajo</li>
                          </ol>
                        </Box>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: 1,
                          p: 2,
                          bgcolor: 'primary.light',
                          borderRadius: 1,
                          color: 'primary.dark'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              Puntos seleccionados: {calibrationPoints.length}/2
                            </Typography>
                            {calibrationPoints.length === 1 && (
                              <Chip 
                                label="Falta 1 punto" 
                                color="primary" 
                                size="small"
                                icon={<TouchApp />} 
                                sx={{ fontWeight: 'bold' }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <TextField 
                              type="number" 
                              size="small"
                              value={calibrationDistance}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (value > 0) {
                                  setCalibrationDistance(value);
                                  // Si ya tenemos dos puntos, recalcular el factor
                                  if (calibrationPoints.length === 2) {
                                    const [p1, p2] = calibrationPoints;
                                    const pixelDistance = Math.sqrt(
                                      Math.pow(p1.x - p2.x, 2) + 
                                      Math.pow(p1.y - p2.y, 2)
                                    );
                                    setCalibrationFactor(value / pixelDistance);
                                    // Redibujar para mostrar la nueva distancia
                                    setTimeout(() => {
                                      if (redrawImageWithCalibrationGuideRef.current) {
                                        redrawImageWithCalibrationGuideRef.current();
                                      }
                                    }, 50);
                                  }
                                }
                              }}
                              label="Distancia en cm"
                              variant="outlined"
                              fullWidth
                              helperText="Ingresá la distancia exacta entre los puntos que vas a marcar"
                              InputProps={{
                                endAdornment: <Typography variant="caption">cm</Typography>
                              }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
                          <InfoOutlined fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="caption">
                            Esta calibración es crucial para una medición precisa de los moldes
                          </Typography>
                        </Box>
                      </Alert>
                    </Grow>
                  )}
                  
                  {calibrationFactor && !isCalibrating && (
                    <Fade in={true} timeout={500}>
                      <Paper 
                        elevation={1} 
                        sx={{ 
                          p: 2, 
                          mb: 2, 
                          bgcolor: 'success.light', 
                          color: 'success.dark',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderRadius: 2,
                        }}
                      >
                        <Check fontSize="small" />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Calibración exitosa: {calibrationDistance} cm = {(calibrationDistance / calibrationFactor).toFixed(1)} px
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: 'block' }}>
                            Factor: {calibrationFactor.toFixed(6)} cm/px
                          </Typography>
                          <Typography variant="caption" sx={{ fontWeight: 'medium', fontStyle: 'italic' }}>
                            Ahora podés usar "Selección Manual" o "Detectar Moldes" para continuar
                          </Typography>
                        </Box>
                      </Paper>
                    </Fade>
                  )}
                </Paper>
              </Fade>
              
              {results && (
                <Grow in={true} timeout={800}>
                  <Paper elevation={3} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Calculate color="secondary" />
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                        Resultados del Análisis
                      </Typography>
                    </Box>
                    
                    <Divider sx={{ mb: 3 }} />
                    
                    <Grid container spacing={3}>
                      {Object.entries(results.byType).map(([type, data]: [string, any], index) => (
                        <Grid key={type} sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }}>
                          <Card sx={{ height: '100%', borderRadius: 2 }}>
                            <CardHeader
                              avatar={
                                <Avatar 
                                  sx={{ 
                                    bgcolor: getMoldTypeColor(type as MoldType),
                                  }}
                                >
                                  {type[0]}
                                </Avatar>
                              }
                              title={type}
                              titleTypographyProps={{ fontWeight: 'bold' }}
                              subheader={`${data.count} molde${data.count !== 1 ? 's' : ''}`}
                            />
                            <CardContent>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Área total:</strong> {data.totalArea.toFixed(2)} cm²
                              </Typography>
                              <Typography variant="body2" color="secondary" sx={{ fontWeight: 'bold' }}>
                                Área con factores: {data.totalAreaWithMultiplier.toFixed(2)} cm²
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 2 }}>
                      <Typography variant="h6" sx={{ mb: 2, color: 'secondary.dark' }}>
                        Resumen Total
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Cantidad de moldes:</strong> {results.total.count}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 1 }}>
                        <strong>Área total:</strong> {results.total.totalArea.toFixed(2)} cm²
                      </Typography>
                      <Typography variant="h6" color="secondary" sx={{ fontWeight: 'bold' }}>
                        Área total con factores: {results.total.totalAreaWithMultiplier.toFixed(2)} cm²
                      </Typography>
                    </Box>
                  </Paper>
                </Grow>
              )}
            </Grid>
            
            {/* Panel derecho: Lista de moldes y controles */}
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 4' } }}>
              <Fade in={true} timeout={1000}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 0, 
                    mb: 3, 
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box 
                    sx={{ 
                      bgcolor: 'primary.main', 
                      color: 'white', 
                      py: 2, 
                      px: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ContourIcon />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Moldes Detectados
                      </Typography>
                    </Box>
                    <Chip 
                      label={moldsDetected.length} 
                      color="primary" 
                      sx={{ 
                        bgcolor: 'white', 
                        color: 'primary.main', 
                        fontWeight: 'bold',
                        minWidth: '32px',
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ p: 2 }}>
                    {moldsDetected.length === 0 ? (
                      <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 2, fontWeight: 500 }}>
                          Aún no se han detectado moldes
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Usá el botón "Detectar Moldes" después de calibrar la imagen
                        </Typography>
                      </Box>
                    ) : (
                      <List sx={{ maxHeight: '60vh', overflow: 'auto', py: 0 }}>
                        {moldsDetected.map((mold) => (
                          <React.Fragment key={mold.id}>
                            <ListItem
                              component="div"
                              sx={{ 
                                cursor: 'pointer',
                                borderRadius: 2,
                                mb: 1,
                                bgcolor: selectedMold === mold.id ? 'action.selected' : 'background.paper',
                                border: '1px solid',
                                borderColor: selectedMold === mold.id ? 'primary.main' : 'divider',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: selectedMold === mold.id ? 'action.selected' : 'action.hover',
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 3px 8px rgba(0,0,0,0.1)',
                                },
                              }}
                              onClick={() => setSelectedMold(mold.id)}
                            >
                              <Badge
                                badgeContent={mold.id + 1}
                                color="primary"
                                sx={{ mr: 1 }}
                              >
                                <Avatar 
                                  sx={{ 
                                    bgcolor: getMoldTypeColor(mold.type),
                                    width: 40,
                                    height: 40,
                                  }}
                                >
                                  <AreaIcon />
                                </Avatar>
                              </Badge>
                              <ListItemText
                                primary={
                                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                                    {mold.type}
                                  </Typography>
                                }
                                secondary={
                                  <Typography variant="body2" color="text.secondary">
                                    {calibrationFactor ? 
                                      <>Dimensiones: {getMoldDimensions(mold.contour, calibrationFactor)} × {mold.multiplier} = {(mold.areaInCm2 * mold.multiplier).toFixed(2)} cm²</> :
                                      <>Área: {mold.areaInCm2.toFixed(2)} cm² × {mold.multiplier} = {(mold.areaInCm2 * mold.multiplier).toFixed(2)} cm²</>
                                    }
                                  </Typography>
                                }
                              />
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteMold(mold.id);
                                }}
                                sx={{ 
                                  opacity: 0.7,
                                  '&:hover': {
                                    opacity: 1,
                                    bgcolor: 'error.light',
                                  }
                                }}
                              >
                                <Delete />
                              </IconButton>
                            </ListItem>
                            
                            {selectedMold === mold.id && (
                              <Grow in={true} timeout={300}>
                                <Box 
                                  sx={{ 
                                    p: 2, 
                                    mb: 2,
                                    bgcolor: 'grey.50',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                  }}
                                >
                                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <TypeIcon fontSize="small" color="primary" />
                                    Tipo de molde:
                                  </Typography>
                                  <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                                    <Select
                                      value={mold.type}
                                      onChange={(e) => changeMoldType(mold.id, e.target.value as MoldType)}
                                      sx={{ borderRadius: 2 }}
                                    >
                                      <MenuItem value={MoldType.CORTE}>{MoldType.CORTE}</MenuItem>
                                      <MenuItem value={MoldType.FORRO}>{MoldType.FORRO}</MenuItem>
                                      <MenuItem value={MoldType.OTRO}>{MoldType.OTRO}</MenuItem>
                                    </Select>
                                  </FormControl>
                                  
                                  <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AutoFixHigh fontSize="small" color="primary" />
                                    Factor multiplicador: {mold.multiplier}x
                                  </Typography>
                                  <Slider
                                    value={mold.multiplier}
                                    min={0.5}
                                    max={4}
                                    step={0.5}
                                    marks
                                    valueLabelDisplay="auto"
                                    onChange={(_, value) => changeMoldMultiplier(mold.id, value as number)}
                                    color="secondary"
                                  />
                                  
                                  {calibrationFactor && (
                                    <Box sx={{ mt: 2, mb: 2, p: 1, bgcolor: 'info.light', borderRadius: 1 }}>
                                      <Typography variant="subtitle2" sx={{ mb: 0.5, color: 'info.dark', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <SquareFoot fontSize="small" />
                                        Dimensiones exactas:
                                      </Typography>
                                      <Typography variant="body2" color="info.dark">
                                        {getMoldDimensions(mold.contour, calibrationFactor)}
                                      </Typography>
                                    </Box>
                                  )}
                                  
                                  <Box sx={{ mt: 2, p: 1, bgcolor: 'secondary.light', borderRadius: 1 }}>
                                    <Typography variant="body2" color="secondary.dark" sx={{ fontWeight: 'bold' }}>
                                      Área con factor: {(mold.areaInCm2 * mold.multiplier).toFixed(2)} cm²
                                    </Typography>
                                  </Box>
                                </Box>
                              </Grow>
                            )}
                          </React.Fragment>
                        ))}
                      </List>
                    )}
                    
                    {moldsDetected.length > 0 && (
                      <Button
                        fullWidth
                        variant="contained"
                        color="secondary"
                        onClick={calculateResults}
                        startIcon={<Calculate />}
                        sx={{ 
                          mt: 2,
                          py: 1.5,
                          fontWeight: 'bold',
                        }}
                      >
                        Calcular Resultados
                      </Button>
                    )}
                  </Box>
                </Paper>
              </Fade>
            </Grid>
          </Grid>
        </Box>
      </Container>
      
      {/* Dialog para clasificación rápida de moldes */}
      <Dialog
        open={showClassificationDialog}
        onClose={() => setShowClassificationDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
          Clasificar Molde
        </DialogTitle>
        <DialogContent sx={{ pt: 2, mt: 2 }}>
          <DialogContentText sx={{ mb: 2 }}>
            ¿Qué tipo de molde es este?
          </DialogContentText>
          <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
            <Button 
              variant={tempMoldType === MoldType.CORTE ? "contained" : "outlined"}
              color="primary" 
              onClick={() => setTempMoldType(MoldType.CORTE)}
              sx={{ minWidth: '100px' }}
            >
              Corte
            </Button>
            <Button 
              variant={tempMoldType === MoldType.FORRO ? "contained" : "outlined"}
              color="secondary" 
              onClick={() => setTempMoldType(MoldType.FORRO)}
              sx={{ minWidth: '100px' }}
            >
              Forro
            </Button>
            <Button 
              variant={tempMoldType === MoldType.OTRO ? "contained" : "outlined"}
              color="warning" 
              onClick={() => setTempMoldType(MoldType.OTRO)}
              sx={{ minWidth: '100px' }}
            >
              Otro
            </Button>
          </Box>
          <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              Tipo seleccionado: <span style={{ color: theme.palette.primary.main }}>{tempMoldType}</span>
            </Typography>
            <Typography variant="body2">
              Después podrás ajustar el multiplicador y más detalles.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowClassificationDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button onClick={applyQuickClassification} variant="contained" color="primary">
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Tutorial paso a paso */}
      <Dialog
        open={showTutorial}
        onClose={() => setShowTutorial(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: 'primary.main', 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between', 
          alignItems: 'center'
        }}>
          {tutorialSteps[tutorialStep].title}
          <IconButton 
            size="small" 
            onClick={() => setShowTutorial(false)}
            sx={{ color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 2 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {tutorialSteps[tutorialStep].content}
          </Typography>
          
          {/* Imagen tutorial según paso */}
          <Box sx={{ 
            width: '100%', 
            height: '200px', 
            bgcolor: 'grey.100', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2, 
            mb: 2 
          }}>
            {tutorialStep === 0 && <Help sx={{ fontSize: 80, color: 'primary.main' }} />}
            {tutorialStep === 1 && <Straighten sx={{ fontSize: 80, color: 'primary.main' }} />}
            {tutorialStep === 2 && <FormatPaint sx={{ fontSize: 80, color: 'secondary.main' }} />}
            {tutorialStep === 3 && <TypeIcon sx={{ fontSize: 80, color: 'warning.main' }} />}
            {tutorialStep === 4 && <Calculate sx={{ fontSize: 80, color: 'success.main' }} />}
          </Box>
        </DialogContent>
        <DialogActions>
          {tutorialStep > 0 && (
            <Button 
              onClick={() => setTutorialStep(prev => prev - 1)}
              color="inherit"
            >
              Anterior
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button 
            onClick={() => {
              if (tutorialStep < tutorialSteps.length - 1) {
                setTutorialStep(prev => prev + 1);
              } else {
                setShowTutorial(false);
                setTutorialStep(0);
              }
            }}
            variant="contained" 
            color="primary"
          >
            {tutorialSteps[tutorialStep].action}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar para mensajes guía */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        action={
          <IconButton
            size="small"
            color="inherit"
            onClick={() => setSnackbarOpen(false)}
          >
            <Close fontSize="small" />
          </IconButton>
        }
        sx={{
          '& .MuiSnackbarContent-root': {
            bgcolor: 'primary.main',
            fontWeight: 'medium'
          }
        }}
      />
      
      {/* Configuración de Debug */}
      <Box sx={{ mb: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={debugMode}
              onChange={(e) => {
                setDebugMode(e.target.checked);
                // Si desactivamos el modo debug mientras se muestra una máscara, restaurar la imagen
                if (!e.target.checked && showingDebugMask) {
                  restoreOriginalImage();
                }
              }}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Modo Debug (visualizar máscara)
            </Typography>
          }
        />
        {showingDebugMask && (
          <Button 
            size="small"
            variant="outlined"
            color="warning"
            onClick={restoreOriginalImage}
            sx={{ ml: 2, fontSize: '0.7rem' }}
          >
            Restaurar Imagen Original
          </Button>
        )}
      </Box>
      
      {/* Controles HSV para el modo Objeto Blanco */}
      {detectionMode === 'white' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Parámetros HSV para detección de objetos blancos:
          </Typography>
          
          <Grid container spacing={1}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
              <Typography variant="caption" color="text.secondary">
                Saturación mín: {hsvParams.sMin}
              </Typography>
              <Slider
                value={hsvParams.sMin}
                min={0}
                max={100}
                step={5}
                onChange={(_, value) => setHsvParams({...hsvParams, sMin: value as number})}
                color="primary"
                size="small"
                sx={{ mb: 1 }}
              />
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
              <Typography variant="caption" color="text.secondary">
                Saturación máx: {hsvParams.sMax}
              </Typography>
              <Slider
                value={hsvParams.sMax}
                min={0}
                max={255}
                step={5}
                onChange={(_, value) => setHsvParams({...hsvParams, sMax: value as number})}
                color="primary"
                size="small"
                sx={{ mb: 1 }}
              />
            </Grid>
            
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
              <Typography variant="caption" color="text.secondary">
                Valor mín: {hsvParams.vMin}
              </Typography>
              <Slider
                value={hsvParams.vMin}
                min={100}
                max={250}
                step={5}
                onChange={(_, value) => setHsvParams({...hsvParams, vMin: value as number})}
                color="primary"
                size="small"
                sx={{ mb: 1 }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ 
            p: 1, 
            bgcolor: 'info.light', 
            color: 'info.dark',
            borderRadius: 1,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            mt: 1
          }}>
            <InfoOutlined fontSize="small" sx={{ mt: 0.2 }} />
            <Typography variant="caption">
              Activá el modo Debug para ver la máscara HSV y ajustar los parámetros. Saturación baja y Valor alto son ideales para detectar objetos blancos.
            </Typography>
          </Box>
        </Box>
      )}
      
      {/* Agregar al archivo en la sección de interfaz de usuario este nuevo botón para el cuentagotas */}
      {/* (Después de los otros botones de acción principal) */}
      <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 4' } }}>
        <Tooltip title="Selecciona un color para detectar áreas similares">
          <Button
            fullWidth
            variant="contained"
            startIcon={<Colorize />}
            onClick={startEyedropper}
            disabled={!imageUrl || isProcessing}
            color="info"
            sx={{ 
              py: 1.5,
              bgcolor: selectionMode === SelectionMode.EYEDROPPER ? theme.palette.info.dark : theme.palette.info.main,
            }}
          >
            Cuentagotas
          </Button>
        </Tooltip>
      </Grid>
      
      {/* Agregar en la sección de ajustes avanzados, después de los controles HSV */}
      {selectionMode === SelectionMode.EYEDROPPER && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteOutlined fontSize="small" />
            Tolerancia del color: {colorTolerance}
          </Typography>
          <Slider
            value={colorTolerance}
            min={5}
            max={50}
            step={5}
            onChange={(_, value) => setColorTolerance(value as number)}
            color="secondary"
            size="small"
            sx={{ mb: 1 }}
            marks={[
              { value: 5, label: 'Exacto' },
              { value: 25, label: 'Medio' },
              { value: 50, label: 'Amplio' }
            ]}
          />
          <Box sx={{ 
            p: 1, 
            bgcolor: 'info.light', 
            color: 'info.dark',
            borderRadius: 1,
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1
          }}>
            <TouchApp fontSize="small" sx={{ mt: 0.2 }} />
            <Typography variant="caption">
              Hacé clic en el color del molde que querés detectar. Ajustá la tolerancia para capturar más o menos tonos similares.
            </Typography>
          </Box>
        </Box>
      )}
    </>
  );
} 