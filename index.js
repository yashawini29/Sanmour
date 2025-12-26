import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import multer from "multer";
import pool from "./db.js";
import bcrypt from "bcrypt";
import path from "path";



const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended:true}));
app.use(express.json());
app.use(express.static("public"));


app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));


// Middleware to pass current path to all views
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("DB error:", err);
  } else {
    console.log("PostgreSQL connected at:", res.rows[0].now);
  }
});


app.set("view engine", "ejs");
app.set("views", "views");

app.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM projects ORDER BY created_at ASC"
    );

    res.render("index.ejs", {
      projects: result.rows,
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).send("Database error");
  }
});

app.get("/about", (req, res) => {
  res.render("about.ejs");
});
app.get("/services", (req, res) => {
  res.render("services.ejs");
});


app.get("/portfolio", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        project_name,
        thumbnail,
        CASE type
          WHEN 1 THEN 'Residential'
          WHEN 2 THEN 'Commercial'
          WHEN 3 THEN 'Independent Bungalows / Villa'
          WHEN 4 THEN 'School'
          WHEN 5 THEN 'Interior Design'
        END AS type_name,
        CASE type
          WHEN 1 THEN 'residential'
          WHEN 2 THEN 'commercial'
          WHEN 3 THEN 'independent'
          WHEN 4 THEN 'school'
          WHEN 5 THEN 'interior'
        END AS type_class
      FROM projects
      ORDER BY id DESC
    `);

    res.render("portfolio.ejs", { projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});


app.get("/single_project/:id", async (req, res) => {
  const projectId = req.params.id;

  try {
    // Fetch project from database
    const result = await pool.query("SELECT * FROM projects WHERE id = $1", [
      projectId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).send("Project not found");
    }

    const project = result.rows[0];
    res.render("single_project.ejs", { project });
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).send("Database error");
  }
});


app.get("/contact", (req, res) => {
  res.render("contact.ejs");
});
app.get("/carrer", (req, res) => {
  res.render("carrer.ejs");
});



// Admin project adding


// admin side login  
app.get("/admin/login", (req,res) =>{
    res.render("admin/login.ejs");
})

app.post("/login-submit", (req, res) => {
  const { username, password } = req.body;

  if (username === "admin@gmail.com" && password === "Admin@123") {
    return res.redirect("/admin");
  }

  res.redirect("/admin/login");
});



// admin side index project
app.get("/admin", (req, res) => {
  res.render("admin/index.ejs");
});


// admin side posting add project

app.post("/addproject", upload.single("thumbnail"), async (req, res) => {
  try {
    const { type, projectName, description } = req.body;
    const thumbnail = req.file ? req.file.filename : null;

    const query = `
      INSERT INTO projects (type, project_name, description, thumbnail)
      VALUES ($1, $2, $3, $4)
    `;

    await pool.query(query, [type, projectName, description, thumbnail]);

    console.log("Project added successfully");
    res.redirect("/admin");
  } catch (err) {
    console.error("Error inserting project:", err);
    res.status(500).send("Database error");
  }
});




// admin side portfolio project
app.get("/admin/portfolio", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        project_name,
        thumbnail,
        CASE type
          WHEN 1 THEN 'Residential'
          WHEN 2 THEN 'Commercial'
          WHEN 3 THEN 'Independent Bungalows / Villa'
          WHEN 4 THEN 'School'
          WHEN 5 THEN 'Interior Design'
        END AS type_name,
        CASE type
          WHEN 1 THEN 'residential'
          WHEN 2 THEN 'commercial'
          WHEN 3 THEN 'independent'
          WHEN 4 THEN 'school'
          WHEN 5 THEN 'interior'
        END AS type_class
      FROM projects
      ORDER BY created_at ASC
    `);

    res.render("admin/portfolio.ejs", { projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});


app.get("/admin/single_project/:id", async (req, res) => {
  const projectId = req.params.id;

  try {
    const result = await pool.query("SELECT * FROM projects WHERE id = $1", [
      projectId,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).send("Project not found");
    }

    const project = result.rows[0];

    // ✅ NO .ejs and NO leading slash
    res.render("admin/single_project.ejs", { project });
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).send("Database error");
  }
});


// admin side delete project

app.post("/admin/delete-project/:id", async (req, res) => {
  const projectId = req.params.id;

  try {
    // Delete project from database
    await pool.query("DELETE FROM projects WHERE id = $1", [projectId]);

    console.log(`Project ${projectId} deleted successfully`);
    res.redirect("/admin/portfolio"); // Redirect back to admin portfolio
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).send("Database error");
  }
});




app.get("/admin/single_project/:id/add_details", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT
        id,
        project_name,
        description,
        thumbnail,        -- ✅ ADD THIS
        type,
        CASE type
          WHEN 1 THEN 'Residential'
          WHEN 2 THEN 'Commercial'
          WHEN 3 THEN 'Independent Bungalows / Villa'
          WHEN 4 THEN 'School'
          WHEN 5 THEN 'Interior Design'
        END AS type_name
      FROM projects
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Project not found");
    }

    res.render("admin/add_details.ejs", {
      project: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});


// Posting add details 

app.post(
  "/admin/add_details/:id",
  upload.array("images", 10), // input name="images"
  async (req, res) => {
    const { id } = req.params;

    try {
      // Get uploaded filenames
      const galleryImages = req.files.map((file) => file.filename);

      await pool.query(
        `
        UPDATE projects
        SET gallery_images = $1
        WHERE id = $2
        `,
        [galleryImages, id]
      );

      console.log("Gallery images added:", galleryImages);

      res.redirect(`/admin/single_project/${id}`);
    } catch (err) {
      console.error("DB ERROR 👉", err.message);
      console.error(err);
      res.status(500).send(err.message);
    }

  }
);

// deleting images from gallery
app.post("/admin/projects/:id/delete-images", async (req, res) => {
  const { id } = req.params;
  const { images } = req.body;

  if (!images) {
    return res.redirect("back");
  }

  // Always treat as array
  const imageArray = Array.isArray(images) ? images : [images];

  try {
    // 1️⃣ Delete files from uploads folder
    imageArray.forEach((img) => {
      const filePath = path.join(process.cwd(), "uploads", img);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    // 2️⃣ Remove images from PostgreSQL array
    await pool.query(
      `
      UPDATE projects
      SET gallery_images = (
        SELECT ARRAY(
          SELECT unnest(gallery_images)
          EXCEPT
          SELECT unnest($1::text[])
        )
      )
      WHERE id = $2
      `,
      [imageArray, id]
    );

    console.log("Deleted images:", imageArray);

    res.redirect(`/admin/single_project/${id}`);
  } catch (err) {
    console.error("Delete image error:", err);
    res.status(500).send("Failed to delete images");
  }
});



app.listen(port,() => {
    console.log("server is running on Port " + port);
})