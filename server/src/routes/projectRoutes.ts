
import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// GET /api/projects - Get visible projects
router.get('/', async (req: Request, res: Response) => {
  try {
    // Get the logged-in user's ID
    const userId = (req as Request & {
      user?: { id: string };
    }).user?.id;

    // Get filters and pagination values
    const { tag, authorId } = req.query;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );

    // Find courses the logged-in user is enrolled in
    const enrollments = userId
      ? await prisma.enrollment.findMany({
          where: { studentId: userId },
          select: { courseId: true },
        })
      : [];

    const courseIds = enrollments.map(
      (enrollment) => enrollment.courseId
    );

    // Build privacy conditions
    const visibilityConditions: any[] = [
      { privacyLevel: 'PUBLIC' },
    ];

    if (userId) {
      visibilityConditions.push(
        { authorId: userId },
        { privacyLevel: 'CAMPUS' },
        {
          privacyLevel: 'CLASS',
          author: {
            enrollments: {
              some: {
                courseId: { in: courseIds },
              },
            },
          },
        }
      );
    }

    // Apply filters and privacy rules
    const where: any = {
      AND: [
        { OR: visibilityConditions },
      ],
    };

    if (typeof tag === 'string' && tag.trim()) {
      where.AND.push({ tags: { has: tag.trim() } });
    }

    if (typeof authorId === 'string') {
      where.AND.push({ authorId });
    }

    // Get projects and total count
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              profilePicture: true,
            },
          },
          comments: {
  include: {
    author: {
      select: {
        id: true,
        name: true,
        username: true,
        profilePicture: true,
      },
    },
  },
},
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),

      prisma.project.count({ where }),
    ]);

    return res.status(200).json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get projects error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve projects.',
    });
  }
});
// GET /api/projects/:id - Get one project
router.get('/:id', async (req: Request, res: Response) => {
  try {
    // Get the logged-in user's ID
    const userId = (req as Request & {
      user?: { id: string };
    }).user?.id;

    // Get the project ID from the URL
    const projectId = req.params.id;

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    // Check whether the project exists
    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    // Check the project's privacy level
    let canView = project.privacyLevel === 'PUBLIC';

    // The author can always view their own project
    if (userId && project.authorId === userId) {
      canView = true;
    }

    // Any logged-in user can view CAMPUS projects
    if (userId && project.privacyLevel === 'CAMPUS') {
      canView = true;
    }

    // CLASS projects require a shared enrolled course
    if (userId && project.privacyLevel === 'CLASS') {
      const viewerEnrollments = await prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { courseId: true },
      });

      const courseIds = viewerEnrollments.map(
        (enrollment) => enrollment.courseId
      );

      const sharedCourse = await prisma.enrollment.findFirst({
        where: {
          studentId: project.authorId,
          courseId: { in: courseIds },
        },
      });

      if (sharedCourse) {
        canView = true;
      }
    }

    // Deny access if the user cannot view the project
    if (!canView) {
      return res.status(403).json({
        message: 'You do not have permission to view this project.',
      });
    }

    return res.status(200).json({
      project,
    });

  } catch (error) {
    console.error('Get project error:', error);

    return res.status(500).json({
      message: 'Failed to retrieve project.',
    });
  }
});


// POST /api/projects - Create a project
router.post('/', async (req: Request, res: Response) => {
  try {
    // Get the logged-in user's ID
    const userId = (req as Request & {
      user?: { id: string };
    }).user?.id;

    // Check authentication
    if (!userId) {
      return res.status(401).json({
        message: 'You must be logged in to create a project.',
      });
    }

    // Get project information from the request body
    const { title, description, tags, privacyLevel } = req.body;

    // Validate required fields
    if (
      typeof title !== 'string' ||
      !title.trim() ||
      typeof description !== 'string' ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: 'Title and description are required.',
      });
    }

    if (
      !Array.isArray(tags) ||
      !tags.every((tag: unknown) => typeof tag === 'string')
    ) {
      return res.status(400).json({
        message: 'Tags must be an array of strings.',
      });
    }

    const allowedPrivacyLevels = [
      'DRAFT',
      'CLASS',
      'CAMPUS',
      'PUBLIC',
    ];

    if (
      privacyLevel !== undefined &&
      !allowedPrivacyLevels.includes(privacyLevel)
    ) {
      return res.status(400).json({
        message: 'Invalid privacy level.',
      });
    }

    // Save the project in the database
    const project = await prisma.project.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        tags,
        privacyLevel: privacyLevel ?? 'CAMPUS',
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
       comments: {
  include: {
    author: {
      select: {
        id: true,
        name: true,
        username: true,
        profilePicture: true,
      },
    },
  },
}, 
      },
    });

    return res.status(201).json({
      message: 'Project created successfully.',
      project,
    });
  } catch (error) {
    console.error('Create project error:', error);

    return res.status(500).json({
      message: 'Failed to create project.',
    });
  }
});

 // PUT /api/projects/:id - Update a project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    // Get the logged-in user's ID
    const userId = (req as Request & {
      user?: { id: string };
    }).user?.id;

    // Check authentication
    if (!userId) {
      return res.status(401).json({
        message: 'You must be logged in to update a project.',
      });
    }

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    // Check project ownership
    if (project.authorId !== userId) {
      return res.status(403).json({
        message: 'Only the project author can update it.',
      });
    }

    // Get updated information
    const { title, description, tags, privacyLevel } = req.body;

    // Prepare the fields to update
    const data: any = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
          message: 'Title must be a non-empty string.',
        });
      }
      data.title = title.trim();
    }

    if (description !== undefined) {
      if (
        typeof description !== 'string' ||
        !description.trim()
      ) {
        return res.status(400).json({
          message: 'Description must be a non-empty string.',
        });
      }
      data.description = description.trim();
    }

    if (tags !== undefined) {
      if (
        !Array.isArray(tags) ||
        !tags.every((tag: unknown) => typeof tag === 'string')
      ) {
        return res.status(400).json({
          message: 'Tags must be an array of strings.',
        });
      }
      data.tags = tags;
    }

    if (privacyLevel !== undefined) {
      const allowedPrivacyLevels = [
        'DRAFT',
        'CLASS',
        'CAMPUS',
        'PUBLIC',
      ];

      if (!allowedPrivacyLevels.includes(privacyLevel)) {
        return res.status(400).json({
          message: 'Invalid privacy level.',
        });
      }
      data.privacyLevel = privacyLevel;
    }

    // Check that at least one field was provided
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: 'Provide at least one field to update.',
      });
    }

    // Update the project in the database
    const updatedProject = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePicture: true,
          },
        },
        comments: {
  include: {
    author: {
      select: {
        id: true,
        name: true,
        username: true,
        profilePicture: true,
      },
    },
  },
},
      },
    });

    return res.status(200).json({
      message: 'Project updated successfully.',
      project: updatedProject,
    });

  } catch (error) {
    console.error('Update project error:', error);

    return res.status(500).json({
      message: 'Failed to update project.',
    });
  }
});

 // DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Get the logged-in user's ID
    const userId = (req as Request & {
      user?: { id: string };
    }).user?.id;

    // Check authentication
    if (!userId) {
      return res.status(401).json({
        message: 'You must be logged in to delete a project.',
      });
    }

    // Find the project
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
    });

    // Check whether the project exists
    if (!project) {
      return res.status(404).json({
        message: 'Project not found.',
      });
    }

    // Check project ownership
    if (project.authorId !== userId) {
      return res.status(403).json({
        message: 'Only the project author can delete it.',
      });
    }

    // Delete the project
    await prisma.project.delete({
      where: { id: req.params.id },
    });

    return res.status(200).json({
      message: 'Project deleted successfully.',
    });

  } catch (error) {
    console.error('Delete project error:', error);

    return res.status(500).json({
      message: 'Failed to delete project.',
    });
  }
});



export default router;
