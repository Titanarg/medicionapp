# Aplicación de Medición de Áreas de Moldes

Aplicación web PWA para medir áreas de moldes en piezas de calzado. Permite cargar imágenes, calibrar la escala utilizando una referencia conocida, detectar y clasificar los moldes, y calcular sus áreas en centímetros cuadrados.

## Características

- **Captura o selección de imágenes**: Permite tomar fotos con la cámara o seleccionar imágenes de la galería.
- **Calibración de escala**: Establece la relación entre píxeles y centímetros usando una referencia conocida.
- **Detección de moldes**: Utiliza algoritmos de visión por computadora para detectar automáticamente los contornos de los moldes.
- **Clasificación de moldes**: Permite clasificar los moldes en diferentes tipos (corte, forro, etc.).
- **Factores multiplicadores**: Aplica factores de multiplicación a cada molde para cálculos de áreas ajustadas.
- **Informe de resultados**: Genera un informe con las áreas totales por tipo de molde.
- **Funcionamiento offline**: Funciona como PWA, permitiendo su uso sin conexión a internet.

## Tecnologías utilizadas

- React.js con TypeScript
- Material UI para la interfaz de usuario
- OpenCV.js para el procesamiento de imágenes
- React Router para la navegación
- PWA para funcionalidad offline

## Instalación

1. Clona este repositorio:
   ```
   git clone <url-del-repositorio>
   ```

2. Navega al directorio del proyecto:
   ```
   cd medicion-moldes-web
   ```

3. Instala las dependencias:
   ```
   npm install
   ```

4. Inicia el servidor de desarrollo:
   ```
   npm start
   ```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

## Uso

1. En la página principal, selecciona una imagen usando la galería o toma una foto con la cámara.
2. Asegúrate de que en la imagen haya una referencia de medida conocida (regla, objeto de dimensiones conocidas).
3. Presiona "Medir Área" para pasar a la página de procesamiento.
4. Calibra la imagen seleccionando dos puntos de una distancia conocida (ej: 10cm en una regla).
5. Presiona "Detectar Moldes" para que la aplicación identifique los moldes en la imagen.
6. Clasifica cada molde según su tipo y ajusta los factores multiplicadores si es necesario.
7. Presiona "Calcular Resultados" para obtener las áreas totales.

## Despliegue en Netlify

Para desplegar esta aplicación en Netlify:

1. Crea una cuenta en [Netlify](https://www.netlify.com/).
2. Desde el dashboard de Netlify, haz clic en "New site from Git".
3. Selecciona tu repositorio.
4. Configura las opciones de construcción:
   - Build command: `npm run build`
   - Publish directory: `build`
5. Haz clic en "Deploy site".

## Desarrollo

### Estructura del proyecto

```
medicion-moldes-web/
├── public/           # Archivos públicos y manifest.json
├── src/              # Código fuente
│   ├── components/   # Componentes reutilizables
│   ├── hooks/        # Hooks personalizados
│   ├── pages/        # Páginas principales
│   ├── types/        # Definiciones de tipos TypeScript
│   ├── App.tsx       # Componente principal
│   └── index.tsx     # Punto de entrada
└── ...
```

## Contribución

1. Haz un fork del proyecto
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`)
3. Realiza tus cambios
4. Commit a tus cambios (`git commit -am 'Añade nueva funcionalidad'`)
5. Push a la rama (`git push origin feature/nueva-funcionalidad`)
6. Crea un nuevo Pull Request

## Licencia

Este proyecto está licenciado bajo la licencia MIT - ver el archivo LICENSE para más detalles.
