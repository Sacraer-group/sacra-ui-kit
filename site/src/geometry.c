/* SACRA UI / Geometry core. C99, freestanding wasm32, zero imports.
 * All surface generation, trigonometry, deformation and projection run in WASM.
 * Output: line-major Float32 xyz; x/y are normalized, z is camera depth.
 * Static memory: one frame per instance. Copy the view if you need to retain it.
 */
#define EXPORT(name) __attribute__((export_name(name)))
#define PI 3.1415926535897932384626433832795
#define TAU (2.0 * PI)
#define SAMPLES 97
#define MAX_LINES 128
static float vertices[MAX_LINES * SAMPLES * 3];
static int current_lines = 0;

static double bounded(double x, double lo, double hi, double fallback) {
    return x >= lo && x <= hi ? x : fallback; /* rejects NaN / infinities */
}
/* Range-reduced sine polynomial. Not intended as a scientific libm substitute. */
static double sn(double x) {
    x -= (int)(x / TAU) * TAU;
    if (x > PI) x -= TAU;
    if (x < -PI) x += TAU;
    if (x > PI / 2) x = PI - x;
    if (x < -PI / 2) x = -PI - x;
    double z = x * x;
    return x * (1.0 + z * (-1.0/6.0 + z * (1.0/120.0 + z * (-1.0/5040.0 + z *
        (1.0/362880.0 + z * (-1.0/39916800.0 + z * (1.0/6227020800.0 + z * (-1.0/1307674368000.0))))))));
}
static double cs(double x) { return sn(x + PI / 2.0); }
EXPORT("sine") double sine(double x) { return sn(bounded(x, -1e6, 1e6, 0)); }
EXPORT("geometry_version") int geometry_version(void) { return 10400; }
EXPORT("vertices_ptr") float *vertices_ptr(void) { return vertices; }
EXPORT("samples_per_line") int samples_per_line(void) { return SAMPLES; }
EXPORT("line_count") int line_count(void) { return current_lines; }
EXPORT("capacity") int capacity(void) { return MAX_LINES * SAMPLES * 3; }

EXPORT("geometry_frame")
int geometry_frame(int mode, double time, int density, double yaw, double pitch, double deformation) {
    time = bounded(time, -1e6, 1e6, 0);
    yaw = bounded(yaw, -1000, 1000, -0.3);
    pitch = bounded(pitch, -1000, 1000, 0.92);
    deformation = bounded(deformation, 0, 1, 0.6);
    density = density < 8 ? 8 : (density > 64 ? 64 : density);
    if (mode < 0 || mode > 5) mode = 0;
    current_lines = (mode == 2 || mode == 5) ? density : density * 2;
    double a = pitch, b = yaw + time * 0.1;
    double ca = cs(a), sa = sn(a), cb = cs(b), sb = sn(b);
    for (int j = 0; j < current_lines; j++) {
        int cross = j >= density;
        double f = (double)(cross ? j-density : j) / density;
        for (int k = 0; k < SAMPLES; k++) {
            double q = (double)k / (SAMPLES-1);
            double u = (cross ? f : q) * TAU;
            double v = (cross ? q : f) * TAU;
            double x, y, z;
            if (mode == 0) { /* deformed torus / reference-inspired */
                double r = 1.0 + .17 * deformation * cs(3*u + time*.5);
                double tube = .34 + .09 * deformation * sn(2*u + time*.4);
                x = (r + tube*cs(v))*cs(u);
                y = (r + tube*cs(v))*sn(u);
                z = tube*sn(v) + .24*deformation*sn(3*u + time*.6);
            } else if (mode == 1) { /* twisted ribbon; double traversal closes each longitudinal line */
                u = (cross ? f : q) * 2*TAU;
                v = ((cross ? q : f)*2 - 1) * .42;
                double twist = u*.5 + .4*deformation*sn(time*.4);
                double r = 1.0 + v*cs(twist);
                x = r*cs(u); y = r*sn(u); z = v*sn(twist)+.08*deformation*sn(3*u+time);
            } else if (mode == 2) { /* orbital ellipses in rotated planes */
                double t = q*TAU, rot = f*PI;
                double r = .72 + .30*f;
                double xx = r*cs(t), yy = r*sn(t);
                x = xx*cs(rot) - yy*sn(rot)*.3;
                y = xx*sn(rot) + yy*cs(rot)*.3;
                z = yy*.9 + deformation*.12*sn(t*3 + time+rot);
            } else if (mode == 3) { /* moving wave surface */
                x = ((cross ? f : q)*2-1)*1.28;
                y = ((cross ? q : f)*2-1)*1.02;
                z = (.12+.22*deformation)*sn(x*3+time)*cs(y*2-time*.7) + .07*sn(y*5+time);
            } else if (mode == 4) { /* pulsating contour sphere */
                u = (cross ? f : q)*TAU;
                v = (cross ? q : f)*PI;
                double r = .94 + .13*deformation*sn(4*u+time)*sn(v)*sn(v);
                x = r*sn(v)*cs(u); y = r*sn(v)*sn(u); z = r*cs(v);
            } else { /* lissajous bundle */
                double t = q*TAU, r = .7+.28*f;
                x = 1.13*r*sn(2*t + f*.5+time*.2);
                y = .78*r*sn(3*t + f*.8);
                z = .42*r*cs(5*t+time*.3)*(.4+deformation);
            }
            double yy = y*ca-z*sa, zz = y*sa+z*ca;
            double xx = x*cb+zz*sb; zz = -x*sb+zz*cb;
            double perspective = 4.8/(4.8+zz);
            int i = (j*SAMPLES+k)*3;
            vertices[i] = (float)(xx*perspective);
            vertices[i+1] = (float)(yy*perspective);
            vertices[i+2] = (float)zz;
        }
    }
    return current_lines*SAMPLES;
}
