from datetime import timedelta
# import the user model here 
from django.db import models
from fsrs import Scheduler


DEFAULT_PARAMETERS = [
    0.212,
    1.2931,
    2.3065,
    8.2956,
    6.4133,
    0.8334,
    3.0194,
    0.001,
    1.8722,
    0.1666,
    0.796,
    1.4835,
    0.0614,
    0.2629,
    1.6483,
    0.6014,
    1.8729,
    0.5425,
    0.0912,
    0.0658,
    0.1542,
]


def default_parameters():
    return DEFAULT_PARAMETERS.copy()


def default_learning_steps():
    return [60, 600]


def default_relearning_steps():
    return [600]


class Schedular(models.Model):
    """
    stores the FSRS scheduler configuration in the database.
    """
    parameters = models.JSONField(
        default=default_parameters,
        help_text="FSRS parameter list used to initialize the scheduler.",
    )
    # add a forgein key to the user table
    desired_retention = models.FloatField(default=0.9)
    learning_steps = models.JSONField(default=default_learning_steps)
    relearning_steps = models.JSONField(default=default_relearning_steps)
    maximum_interval = models.IntegerField(default=36500)
    enable_fuzzing = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "FSRS Scheduler"
        verbose_name_plural = "FSRS Schedulers"


    def build_scheduler(self) -> Scheduler:
        """
        Create a live fsrs.Scheduler instance from this model record.
        """
        return Scheduler(
            parameters=tuple(self.parameters),
            desired_retention=self.desired_retention,
            learning_steps=tuple(timedelta(seconds=s) for s in self.learning_steps),
            relearning_steps=tuple(
                timedelta(seconds=s) for s in self.relearning_steps
            ),
            maximum_interval=self.maximum_interval,
            enable_fuzzing=self.enable_fuzzing,
        )
