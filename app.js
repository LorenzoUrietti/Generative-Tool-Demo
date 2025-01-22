let uploaded_image;
let is_loading = false;
const canvas_container = document.getElementById('canvas_container');
const canvas_width = canvas_container.offsetWidth;
const canvas_height = canvas_container.offsetHeight;
let bg_color = '#d5e2f0';
let canvas_original_width;
let canvas_original_height;
const input_image = document.getElementById('input_image');
const reset_btn = document.getElementById('reset_btn');
const scale_slider = document.getElementById('scale_slider');
scale_slider.disabled = true;
let resol = 200;
const export_jpg_btn = document.getElementById('export_jpg_btn');
const export_gif_btn = document.getElementById('export_gif_btn');
let fps = 24;
let rec_duration_seconds = 3;
let duration = rec_duration_seconds*fps;
let gif_recorder;
let is_recording = false;

window.addEventListener('load', () => {
    const container = document.getElementById('canvas_container');
    canvas_original_width = container.offsetWidth;
    canvas_original_height = container.offsetHeight;
});

function setup() {
    frameRate(fps);
    createCanvas(canvas_width, canvas_height, WEBGL).parent('canvas_container');
    background(bg_color);
   
    input_image.addEventListener('change',handle_image_upload);
    document.querySelectorAll('.color_btn').forEach(button => {
        button.addEventListener('click', changeBackgroundColor);
      });

    scale_slider.addEventListener('input', update_scale_slider);
    reset_btn.addEventListener('click',reset_canvas);

    export_jpg_btn.addEventListener('click',export_jpg);
    export_gif_btn.addEventListener('click',export_gif);
}

function draw() {
    background(bg_color);
    if (uploaded_image) {
        translate(-width/2, -height/2);
        dither();
        if(is_recording) {
            current_frame++;
            if (current_frame > duration) {
              is_recording = false;
              current_frame = 0;
          }
        }
    } else {
        resizeCanvas(canvas_original_width, canvas_original_height);
        canvas_container.style.width = canvas_original_width + 'px';
        canvas_container.style.height = canvas_original_height + 'px';
        current_frame = 0;
    }
}   

function reset_canvas() {
    uploaded_image = null;
    input_image.value = '';
    redraw();
    update_scale_slider();
    current_frame = 0;

}

function resize_canvas() {
    const container = document.getElementById('canvas_container');
    let new_width, new_height;
    let uploaded_image_ratio = uploaded_image.width/uploaded_image.height;
    
    if (uploaded_image.width > uploaded_image.height) {
        new_width = canvas_width;
        new_height = canvas_width/uploaded_image_ratio;
        if (new_height > canvas_height) {
            new_height = canvas_height;
            new_width = canvas_height * uploaded_image_ratio;
        }
    } else {
        new_height = canvas_height;
        new_width = canvas_height * uploaded_image_ratio;
        if(new_width > canvas_width) {
            new_width = canvas_width;
            new_height = canvas_width/uploaded_image_ratio;
        }
    }

    new_width = Math.ceil(new_width);
    new_height = Math.ceil(new_height);
    
    uploaded_image.resize(new_width, new_height);
    resizeCanvas(new_width, new_height);
    
    container.style.width = new_width + 'px';
    container.style.height = new_height + 'px';  
}

function changeBackgroundColor(event) {
  bg_color = event.target.getAttribute('data-color');        

    document.querySelectorAll('.color_btn').forEach(button => {
      button.classList.remove('color_btn_active');
    });      

    event.target.classList.add('color_btn_active');
}

function update_scale_slider(){
  if (uploaded_image) {
      scale_slider.disabled = false;
      scale_slider.style.cursor = 'pointer';

  } else {
      scale_slider.disabled = true;
      scale_slider.value = 10;
      scale_slider.style.cursor = 'not-allowed';
  }
}

function handle_image_upload(event) {   
    const file = event.target.files[0];
    const maxSize = 10 * 1024 * 1024; // 10MB limit
    
    if (file.size > maxSize) {
      alert('L\'immagine deve essere di dimensioni inferiori a 10MB.');
      return;
    }

    if (file.type.match(/image\/(png|jpeg|jpg|gif)/i)) {
      let reader = new FileReader();
      reader.onload = function(e) {
        loadImage(e.target.result, img => {
            uploaded_image = img;
            resize_canvas();
            downscale_image();
            update_scale_slider();
        });
      }
      reader.readAsDataURL(file);
    }
    return uploaded_image;

}

function downscale_image() {
  uploaded_image.resize(Math.ceil(uploaded_image.width/5), Math.ceil(0));
  uploaded_image.resize(Math.ceil(uploaded_image.width*5), Math.ceil(0));
}

function dither() {
  let tileW = width / uploaded_image.width;
  let tileH = height / uploaded_image.height;
  push();
  translate(width/2, height/2);
  let wave = radians(current_frame*current_frame/100);
  rotateX(wave);
  let skipFactor = parseInt(scale_slider.value); 
  
  for (let x = 0; x < uploaded_image.width; x += skipFactor) {
    for (let y = 0; y < uploaded_image.height; y += skipFactor) {
      let c = uploaded_image.get(x, y);
      let b = brightness(c);
      let scalar = map(b, 0, 100, 0.9, 0);
      
      if (scalar > 0.1) { 
        push();
        fill(0);
        translate(
          (x - uploaded_image.width/2) * tileW, 
          (y - uploaded_image.height/2) * tileH, 
          map(b, 0, 230, current_frame*current_frame/2, -current_frame*current_frame/2)
        );
        box(tileW * scalar * skipFactor, tileH * scalar * skipFactor, tileW * skipFactor * scalar);
        pop();
      }
    }
  }
  
  pop();
}

function keyPressed() {
if(key == ' ') {
    if(is_recording) {
      is_recording = false;
      current_frame = 0;
    } else {
      is_recording = true;
    }
  }
}


async function export_jpg() {
    const canvas = document.querySelector('canvas'); // Select the p5.js canvas
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'rendered.jpg',
                types: [{
                    description: 'JPG Image',
                    accept: { 'image/jpeg': ['.jpg'] },
                }],
            });

            const writable = await handle.createWritable();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
            await writable.write(blob);
            await writable.close();

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Failed to save the image:', err);
            } else {
                console.log('Save operation was cancelled by the user');
            }
        }
    } else {
        saveCanvas('output', 'jpg');
    }
}

async function export_gif() {
      saveGif('output', duration, {units: 'frames'});
      is_recording = false;
      current_frame = 0;
  
}
